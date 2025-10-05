import fs from 'fs/promises';
import path from 'path';
import AuthManager from './modules/auth.js';
import TimetableManager from './modules/timetable.js';
import CacheManager from './modules/cache.js';
import NotificationManager from './modules/notifications.js';

const authManager = new AuthManager();
const timetableManager = new TimetableManager(authManager);
const cacheManager = new CacheManager();
const notificationManager = new NotificationManager();

// Load env variables
const VERBOSE_LOGS = process.env.VERBOSE_LOGS === 'true';

// Vercel serverless handler
export default async function handler(req, res) {
  const url = req.url;

  try {
    if (url.startsWith('/api/timetable')) {
      // Serve cached timetable if available
      const timetableData = await cacheManager.loadTimetableCache();
      if (!timetableData) {
        return res.status(404).json({ success: false, error: 'No timetable data. Refresh first.' });
      }

      const processedData = timetableData.map(classItem => timetableManager.processClassItem(classItem));
      res.status(200).json({ success: true, data: processedData, cached: true });
    } 
    else if (url.startsWith('/api/refresh')) {
      // Fetch fresh data
      let freshData = await timetableManager.fetchFreshTimetableData();

      // Detect changes
      const changes = await cacheManager.detectScheduleChangesWithPersistence(freshData);
      if (changes.hasChanges) {
        await notificationManager.sendScheduleChangeNotifications(changes.changes);
      }

      // Save cache
      await cacheManager.saveTimetableCache(freshData, authManager.getSessionCookies());

      const processedData = freshData.map(item => timetableManager.processClassItem(item));
      res.status(200).json({ success: true, data: processedData, cached: false });
    } 
    else {
      res.status(404).json({ error: 'Route not found' });
    }
  } catch (error) {
    console.error('❌ Serverless function error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
