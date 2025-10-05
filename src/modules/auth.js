const fs = require('fs').promises;

class AuthManager {
    constructor() {
        this.sessionCookies = null;
        this.SESSION_FILE = './src/data/session_cookies.json';
    }

    async saveSessionData() {
        try {
            // Read existing session_cookies.json to preserve login data
            let sessionData;
            try {
                const existingContent = await fs.readFile(this.SESSION_FILE, 'utf8');
                sessionData = JSON.parse(existingContent);
            } catch (error) {
                // File doesn't exist or is invalid, create new structure
                sessionData = {
                    timestamp: new Date().toISOString(),
                    username: process.env.LPU_USERNAME || '',
                    cookies: '',
                    cookieArray: [],
                    loginSuccess: false
                };
            }
            
            // Update with current session cookies
            sessionData.cookies = this.sessionCookies;
            sessionData.cookieArray = this.sessionCookies ? [this.sessionCookies] : [];
            sessionData.timestamp = new Date().toISOString();
            sessionData.loginSuccess = !!this.sessionCookies;
            
            await fs.writeFile(this.SESSION_FILE, JSON.stringify(sessionData, null, 2));
            console.log('💾 Session saved');
        } catch (error) {
            console.error('❌ Error saving session data:', error.message);
        }
    }

    async loadSessionData() {
        try {
            const sessionContent = await fs.readFile(this.SESSION_FILE, 'utf8');
            const sessionData = JSON.parse(sessionContent);
            
            if (sessionData && sessionData.cookies && sessionData.loginSuccess) {
                const sessionTime = new Date(sessionData.timestamp);
                const timeSinceUpdate = Date.now() - sessionTime.getTime();
                const hoursSinceUpdate = Math.floor(timeSinceUpdate / (1000 * 60 * 60));
                
                // Check if session is older than 30 minutes (likely expired)
                if (timeSinceUpdate > 30 * 60 * 1000) {
                    console.log(`📂 Session found but expired (${hoursSinceUpdate}h old), clearing...`);
                    await this.clearSessionData();
                    return false;
                }
                
                this.sessionCookies = sessionData.cookies;
                
                console.log(`📂 Session loaded (${hoursSinceUpdate}h old)`);
                
                return true;
            }
            
            return false;
        } catch (error) {
            console.log('📂 No session found');
            return false;
        }
    }

    async clearSessionData() {
        this.sessionCookies = null;
        
        // Also delete the session file to prevent reloading expired session
        try {
            await fs.unlink(this.SESSION_FILE);
            console.log('🗑️ Session cleared and file deleted');
        } catch (error) {
            console.log('🗑️ Session cleared');
        }
    }

    async authenticateWithUMS(forceRefresh = false) {
        try {
            // Try to load existing session first (unless force refresh)
            if (!forceRefresh && this.sessionCookies) {
                console.log('✅ Using cached session');
                return this.sessionCookies;
            }

            console.log('🔐 Authenticating with UMS using login.js...');
            
            // Import and use the login automation
            const { LPUAutomatedLogin } = require('../login.js');
            const automation = new LPUAutomatedLogin();
            
            const result = await automation.runAutomation();
            
            if (result.success && result.cookies) {
                this.sessionCookies = result.cookies;
                console.log('✅ Authentication successful');
                
                // Save session data
                await this.saveSessionData();
                
                return this.sessionCookies;
            } else {
                throw new Error('Authentication failed - no valid cookies received');
            }
        } catch (error) {
            console.error('❌ UMS Authentication failed:', error.message);
            await this.clearSessionData();
            return null;
        }
    }

    getSessionCookies() {
        return this.sessionCookies;
    }

    hasValidSession() {
        return !!this.sessionCookies;
    }
}

module.exports = AuthManager;
