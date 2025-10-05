require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;

// Import modules
const AuthManager = require('./modules/auth');
const TimetableManager = require('./modules/timetable');
const NotificationManager = require('./modules/notifications');
const CacheManager = require('./modules/cache');

const app = express();
const PORT = process.env.PORT || 3000;
const AUTO_REFRESH_INTERVAL = parseInt(process.env.AUTO_REFRESH_INTERVAL) || 30; // minutes
const AUTO_REFRESH_ENABLED = process.env.AUTO_REFRESH_ENABLED !== 'false'; // default: true
const PWA_VERSION = process.env.PWA_VERSION || '1.2.0';
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';

// Initialize managers
const authManager = new AuthManager();
const timetableManager = new TimetableManager(authManager);
const notificationManager = new NotificationManager();
const cacheManager = new CacheManager();

// Global variables
let autoRefreshTimer = null;

// Middleware
app.use(cors());
app.use(express.json());

// Serve service worker with version injection BEFORE static files
app.get('/sw.js', async (req, res) => {
    try {
        const swPath = path.join(__dirname, '../public/sw.js');
        let swContent = await fs.readFile(swPath, 'utf8');
        
        // Replace version placeholder with actual version
        swContent = swContent.replace('{{PWA_VERSION}}', PWA_VERSION);
        
        res.setHeader('Content-Type', 'application/javascript');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(swContent);
    } catch (error) {
        console.error('❌ Error serving service worker:', error.message);
        res.status(500).send('Service worker not found');
    }
});

// Static files with cache control
app.use(express.static(path.join(__dirname, '../public'), {
    setHeaders: (res, path) => {
        // No cache for HTML files to ensure updates
        if (path.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }
        // Cache other static assets but allow revalidation
        else if (path.endsWith('.css') || path.endsWith('.js') || path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.ico')) {
            res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
        }
    }
}));

// Auto refresh function
async function autoRefreshTimetable() {
    try {
        console.log('🔄 Auto-refresh...');
        
        const freshData = await timetableManager.fetchFreshTimetableData();
        
        // Detect schedule changes and send notifications
        const changeDetection = await cacheManager.detectScheduleChangesWithPersistence(freshData);
        if (changeDetection.hasChanges) {
            console.log(`📊 Schedule changes detected: ${changeDetection.changes.length} changes`);
            await notificationManager.sendScheduleChangeNotifications(changeDetection.changes);
        }
        
        await cacheManager.saveTimetableCache(freshData, authManager.getSessionCookies());
        
        console.log('✅ Auto-refresh done');
    } catch (error) {
        console.error('❌ Auto-refresh failed:', error.message);
    }
}

// Setup auto refresh timer
function setupAutoRefresh() {
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
    
    if (AUTO_REFRESH_ENABLED) {
        const intervalMs = AUTO_REFRESH_INTERVAL * 60 * 1000;
        autoRefreshTimer = setInterval(autoRefreshTimetable, intervalMs);
        console.log(`⏰ Auto-refresh every ${AUTO_REFRESH_INTERVAL}m`);
    } else {
        console.log('⏰ Auto-refresh disabled');
    }
}

// Routes
app.get('/', async (req, res) => {
    try {
        const htmlPath = path.join(__dirname, '../public/index.html');
        let htmlContent = await fs.readFile(htmlPath, 'utf8');
        
        // Inject version into CSS and JS URLs
        htmlContent = htmlContent.replace(
            'href="assets/css/main.css"',
            `href="assets/css/main.css?v=${PWA_VERSION}"`
        );
        htmlContent = htmlContent.replace(
            'src="assets/js/app.js"',
            `src="assets/js/app.js?v=${PWA_VERSION}"`
        );
        
        // Inject OneSignal App ID from environment variable
        const oneSignalAppId = process.env.ONESIGNAL_APP_ID || '6f9f049b-b551-4146-bf55-e5eca15cd724';
        htmlContent = htmlContent.replace(
            /appId:\s*["'][^"']*["']/,
            `appId: "${oneSignalAppId}"`
        );
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(htmlContent);
    } catch (error) {
        console.error('❌ Error serving HTML:', error.message);
        res.status(500).send('Page not found');
    }
});

// Get timetable data (from cached JSON)
app.get('/api/timetable', async (req, res) => {
    try {
        if (VERBOSE_LOGS) console.log('📂 Loading cached timetable data...');
        
        // Load data from cache file
        const timetableData = await cacheManager.loadTimetableCache();
        
        if (!timetableData) {
            throw new Error('No timetable data available. Please refresh first.');
        }
        
        // Process each class item to add parsed information
        const processedData = timetableData.map(classItem => timetableManager.processClassItem(classItem));
        
        // Get cache timestamp
        let cacheTimestamp = new Date().toISOString();
        try {
            const cacheData = JSON.parse(await fs.readFile(cacheManager.CACHE_FILE, 'utf8'));
            if (cacheData.timestamp) {
                cacheTimestamp = cacheData.timestamp;
            }
        } catch (error) {
            // Cache file doesn't exist or is invalid, use current time
        }
        
        res.json({
            success: true,
            data: processedData,
            cached: true,
            timestamp: cacheTimestamp
        });
    } catch (error) {
        console.error('❌ Error serving timetable:', error.message);
        res.status(500).json({ 
            error: 'Failed to load timetable data',
            message: error.message,
            sessionExpired: error.message.includes('Session expired')
        });
    }
});

// Force refresh from real API - fetches fresh data and saves to JSON
app.post('/api/refresh', async (req, res) => {
    try {
        if (VERBOSE_LOGS) console.log('🔄 Fetching fresh data from UMS...');
        
        // Try to fetch fresh data first
        let freshData;
        try {
            freshData = await timetableManager.fetchFreshTimetableData();
        } catch (error) {
            // If session expired, clear it and try again
            if (error.message.includes('Session expired')) {
                if (VERBOSE_LOGS) console.log('🔐 Session expired, re-authenticating...');
                await authManager.clearSessionData();
                freshData = await timetableManager.fetchFreshTimetableData();
            } else {
                throw error;
            }
        }

        // Skipped saving freshData to txt as per request
        
        // Detect schedule changes and send notifications
        const changeDetection = await cacheManager.detectScheduleChangesWithPersistence(freshData);
        if (changeDetection.hasChanges) {
            console.log(`📊 Schedule changes detected: ${changeDetection.changes.length} changes`);
            await notificationManager.sendScheduleChangeNotifications(changeDetection.changes);
        }
        
        // Save fresh data to JSON cache
        await cacheManager.saveTimetableCache(freshData, authManager.getSessionCookies());
        
        // Process the fresh data before sending
        const processedData = freshData.map(classItem => timetableManager.processClassItem(classItem));
        
        res.json({ 
            success: true, 
            data: processedData,
            message: 'Timetable refreshed successfully and saved to cache',
            cached: false,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('❌ Manual refresh failed:', error.message);
        res.status(500).json({ 
            success: false,
            error: 'Failed to refresh timetable',
            message: error.message,
            sessionExpired: error.message.includes('Session expired')
        });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        lastCacheUpdate: cacheManager.getCacheTimestamp(),
        autoRefreshEnabled: AUTO_REFRESH_ENABLED,
        autoRefreshInterval: AUTO_REFRESH_ENABLED ? `${AUTO_REFRESH_INTERVAL} minutes` : 'disabled',
        hasSessionCookies: authManager.hasValidSession(),
        pwaVersion: PWA_VERSION
    });
});

// OneSignal notification endpoint
app.post('/api/send-notification', async (req, res) => {
    try {
        const { title, message, userIds, data } = req.body;
        
        if (!title || !message) {
            return res.status(400).json({
                success: false,
                error: 'Title and message are required'
            });
        }
        
        // Send notification using OneSignal API
        const result = await notificationManager.sendOneSignalNotification(title, message, data || {});
        
        if (result) {
            res.json({
                success: true,
                message: 'Notification sent successfully',
                title,
                message,
                recipients: userIds ? userIds.length : 'all',
                oneSignalId: result.id
            });
        } else {
            res.status(500).json({
                success: false,
                error: 'Failed to send notification'
            });
        }
    } catch (error) {
        console.error('Error sending notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send notification'
        });
    }
});

// Test notification endpoint for debugging
app.post('/api/test-notification', async (req, res) => {
    try {
        const result = await notificationManager.sendTestNotification();
        
        res.json({
            success: true,
            message: 'Test notification sent',
            oneSignalId: result?.id || 'unknown',
            debug: {
                appId: process.env.ONESIGNAL_APP_ID,
                apiKey: process.env.ONESIGNAL_API_KEY ? 'Set' : 'Missing'
            }
        });
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to send test notification',
            details: error.message
        });
    }
});

// Catch all route
app.get('*', async (req, res) => {
    try {
        const htmlPath = path.join(__dirname, '../public/index.html');
        let htmlContent = await fs.readFile(htmlPath, 'utf8');
        
        // Inject version into CSS and JS URLs
        htmlContent = htmlContent.replace(
            'href="assets/css/main.css"',
            `href="assets/css/main.css?v=${PWA_VERSION}"`
        );
        htmlContent = htmlContent.replace(
            'src="assets/js/app.js"',
            `src="assets/js/app.js?v=${PWA_VERSION}"`
        );
        
        // Inject OneSignal App ID from environment variable
        const oneSignalAppId = process.env.ONESIGNAL_APP_ID || '6f9f049b-b551-4146-bf55-e5eca15cd724';
        htmlContent = htmlContent.replace(
            /appId:\s*["'][^"']*["']/,
            `appId: "${oneSignalAppId}"`
        );
        
        res.setHeader('Content-Type', 'text/html');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.send(htmlContent);
    } catch (error) {
        console.error('❌ Error serving HTML:', error.message);
        res.status(500).send('Page not found');
    }
});

// Initialize and start server
async function initialize() {
    console.log('🚀 Starting LPU Timetable Server...');
    
    // Load session data if available
    await authManager.loadSessionData();
    
    // Load initial cache if available
    await cacheManager.loadTimetableCache();
    
    // Load previous timetable data for change detection
    const previousData = await cacheManager.loadPreviousTimetableData();
    if (previousData) {
        cacheManager.lastTimetableData = previousData;
        console.log('📂 Previous timetable data loaded for change detection');
    }
    
    // Initial fresh fetch to ensure latest data on startup
    try {
        if (VERBOSE_LOGS) console.log('🔄 Initial fetch on startup...');
        await autoRefreshTimetable();
    } catch (e) {
        console.error('⚠️ Initial fetch failed:', e.message);
    }

    // Setup auto refresh
    setupAutoRefresh();
    
    // Start server
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    if (autoRefreshTimer) {
        clearInterval(autoRefreshTimer);
    }
    process.exit(0);
});

// Start the application
initialize().catch(error => {
    console.error('❌ Failed to initialize server:', error.message);
    process.exit(1);
});