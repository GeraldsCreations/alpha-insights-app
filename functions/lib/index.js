"use strict";
/**
 * Alpha Insights Cloud Functions
 *
 * Scheduled functions:
 * - publishDailyReports: Run research pipeline and publish analyses
 * - checkPriceAlerts: Monitor price alerts and send notifications
 * - resetMonthlyQuotas: Reset user quotas monthly
 *
 * Triggered functions:
 * - onAnalysisPublished: Notify users when new analysis is published
 * - onBookmarkCreated: Update bookmark count
 * - onBookmarkDeleted: Update bookmark count
 * - onUserCreated: Initialize user document in Firestore
 * - onCustomReportRequestCreated: Process custom research requests
 * - onResearchTriggerCompleted: Update requests when research completes
 *
 * Callable functions:
 * - checkAndDecrementQuota: Check and decrement user quota
 * - getUserQuota: Get user's current quota status
 * - setUserPremium: Admin function to upgrade users
 * - submitCustomReportRequest: Submit custom research request
 * - getUserCustomRequests: Get user's custom request history
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserStats = exports.trackAnalytics = exports.onUserCreated = exports.onBookmarkDeleted = exports.onBookmarkCreated = exports.onAnalysisPublished = exports.checkPriceAlerts = exports.publishDailyReports = exports.getUserCustomRequests = exports.submitCustomReportRequest = exports.onResearchTriggerCompleted = exports.onCustomReportRequestCreated = exports.setUserPremium = exports.resetMonthlyQuotas = exports.getUserQuota = exports.checkAndDecrementQuota = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// Import quota and custom request functions
const quotaFunctions = __importStar(require("./quota-functions"));
const customRequestFunctions = __importStar(require("./custom-request-functions"));
// Export quota functions
exports.checkAndDecrementQuota = quotaFunctions.checkAndDecrementQuota;
exports.getUserQuota = quotaFunctions.getUserQuota;
exports.resetMonthlyQuotas = quotaFunctions.resetMonthlyQuotas;
exports.setUserPremium = quotaFunctions.setUserPremium;
// Export custom request functions
exports.onCustomReportRequestCreated = customRequestFunctions.onCustomReportRequestCreated;
exports.onResearchTriggerCompleted = customRequestFunctions.onResearchTriggerCompleted;
exports.submitCustomReportRequest = customRequestFunctions.submitCustomReportRequest;
exports.getUserCustomRequests = customRequestFunctions.getUserCustomRequests;
const db = admin.firestore();
// const auth = admin.auth(); // Uncomment if needed later
// ============================================================================
// SCHEDULED FUNCTIONS
// ============================================================================
/**
 * Publish Daily Reports
 * Trigger: Every day at 6:00 AM EST
 * Purpose: Run research pipeline for configured tickers
 */
exports.publishDailyReports = functions.pubsub
    .schedule('0 6 * * *')
    .timeZone('America/New_York')
    .onRun(async (context) => {
    const tickers = ['AAPL', 'TSLA', 'NVDA', 'MSFT', 'GOOGL', 'BTC', 'ETH'];
    console.log(`Starting daily report generation for ${tickers.length} tickers`);
    const results = [];
    for (const ticker of tickers) {
        try {
            // TODO: Integrate with research pipeline
            // For now, this is a placeholder
            console.log(`Processing ${ticker}...`);
            // In production, this would:
            // 1. Execute research pipeline script
            // 2. Wait for completion
            // 3. Run publish-analysis.ts script
            // 4. Trigger notifications
            results.push({ ticker, status: 'success' });
        }
        catch (error) {
            console.error(`Error processing ${ticker}:`, error);
            results.push({ ticker, status: 'error', error: String(error) });
        }
    }
    console.log('Daily report generation complete:', results);
    return results;
});
/**
 * Check Price Alerts
 * Trigger: Every 5 minutes
 * Purpose: Monitor price alerts and send push notifications
 */
exports.checkPriceAlerts = functions.pubsub
    .schedule('*/5 * * * *')
    .onRun(async (context) => {
    console.log('Checking price alerts...');
    try {
        // Get all active (non-triggered) alerts
        const alertsSnapshot = await db.collection('price_alerts')
            .where('triggered', '==', false)
            .get();
        if (alertsSnapshot.empty) {
            console.log('No active alerts to check');
            return null;
        }
        console.log(`Found ${alertsSnapshot.size} active alerts`);
        // Get unique tickers
        const tickers = new Set();
        alertsSnapshot.docs.forEach(doc => {
            tickers.add(doc.data().ticker);
        });
        // TODO: Fetch current prices from API
        // For now, using mock data
        const currentPrices = {};
        // In production: currentPrices = await fetchCurrentPrices(Array.from(tickers));
        const triggeredAlerts = [];
        for (const alertDoc of alertsSnapshot.docs) {
            const alert = alertDoc.data();
            const currentPrice = currentPrices[alert.ticker] || alert.currentPrice;
            // Check if alert should trigger
            const shouldTrigger = checkAlertCondition(alert, currentPrice);
            if (shouldTrigger) {
                // Mark alert as triggered
                await alertDoc.ref.update({
                    triggered: true,
                    triggeredAt: admin.firestore.FieldValue.serverTimestamp(),
                    triggeredPrice: currentPrice
                });
                // Send push notification
                await sendAlertNotification(alert.userId, alert, currentPrice);
                triggeredAlerts.push({
                    alertId: alertDoc.id,
                    ticker: alert.ticker,
                    type: alert.alertType,
                    targetPrice: alert.targetPrice,
                    currentPrice
                });
            }
        }
        console.log(`Triggered ${triggeredAlerts.length} alerts`);
        return triggeredAlerts;
    }
    catch (error) {
        console.error('Error checking price alerts:', error);
        throw error;
    }
});
/**
 * Check if alert condition is met
 */
function checkAlertCondition(alert, currentPrice) {
    const { alertType, targetPrice } = alert;
    switch (alertType) {
        case 'ENTRY':
            // Trigger when price reaches or crosses entry point
            return Math.abs(currentPrice - targetPrice) / targetPrice <= 0.01; // Within 1%
        case 'STOP':
            // Trigger when price drops below stop loss
            return currentPrice <= targetPrice;
        case 'TARGET':
            // Trigger when price reaches or exceeds target
            return currentPrice >= targetPrice;
        default:
            return false;
    }
}
/**
 * Send push notification for triggered alert
 */
async function sendAlertNotification(userId, alert, currentPrice) {
    var _a;
    try {
        // Get user's FCM token
        const userDoc = await db.collection('users').doc(userId).get();
        const fcmToken = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
        if (!fcmToken) {
            console.log(`No FCM token for user ${userId}`);
            return;
        }
        const message = {
            notification: {
                title: `${alert.ticker} Alert Triggered!`,
                body: `${alert.alertType}: $${currentPrice.toFixed(2)} ${alert.alertType === 'STOP' ? '⚠️' : '✅'}`
            },
            data: {
                type: 'price_alert',
                ticker: alert.ticker,
                alertType: alert.alertType,
                currentPrice: String(currentPrice),
                postId: alert.postId || ''
            },
            token: fcmToken
        };
        await admin.messaging().send(message);
        console.log(`Sent notification to ${userId} for ${alert.ticker}`);
    }
    catch (error) {
        console.error(`Error sending notification to ${userId}:`, error);
    }
}
// ============================================================================
// FIRESTORE TRIGGERED FUNCTIONS
// ============================================================================
/**
 * On Analysis Published
 * Trigger: New document in AnalysisPosts collection
 * Purpose: Notify users watching the ticker
 */
exports.onAnalysisPublished = functions.firestore
    .document('analysis_posts/{postId}')
    .onCreate(async (snap, context) => {
    var _a, _b;
    const post = snap.data();
    console.log(`New analysis published: ${post.ticker} - ${post.title}`);
    try {
        // Find users watching this ticker
        const usersSnapshot = await db.collection('users')
            .where('watchlist', 'array-contains', post.ticker)
            .get();
        if (usersSnapshot.empty) {
            console.log(`No users watching ${post.ticker}`);
            return null;
        }
        console.log(`Found ${usersSnapshot.size} users watching ${post.ticker}`);
        // Filter users with notifications enabled
        const notificationTokens = [];
        for (const userDoc of usersSnapshot.docs) {
            const userData = userDoc.data();
            // Check notification preferences
            const watchlistNotifications = (_a = userData.notificationPreferences) === null || _a === void 0 ? void 0 : _a.watchlistUpdates;
            const highConfidenceNotifications = (_b = userData.notificationPreferences) === null || _b === void 0 ? void 0 : _b.highConfidence;
            const shouldNotify = watchlistNotifications ||
                (highConfidenceNotifications && post.confidenceLevel >= 8);
            if (shouldNotify && userData.fcmToken) {
                notificationTokens.push(userData.fcmToken);
            }
        }
        if (notificationTokens.length === 0) {
            console.log('No users to notify');
            return null;
        }
        // Send batch notifications
        const message = {
            notification: {
                title: `New ${post.ticker} Analysis`,
                body: `${post.recommendation} - ${post.confidenceLevel}/10 confidence ⚡`,
            },
            data: {
                type: 'new_analysis',
                postId: snap.id,
                ticker: post.ticker,
                recommendation: post.recommendation
            }
        };
        const results = await Promise.all(notificationTokens.map(token => admin.messaging().send(Object.assign(Object.assign({}, message), { token })).catch(err => {
            console.error('Error sending to token:', err);
            return null;
        })));
        const successCount = results.filter(r => r !== null).length;
        console.log(`Sent ${successCount}/${notificationTokens.length} notifications`);
        // Track analytics
        await db.collection('analytics').add({
            eventType: 'analysis_published',
            ticker: post.ticker,
            postId: snap.id,
            notificationsSent: successCount,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return { notificationsSent: successCount };
    }
    catch (error) {
        console.error('Error in onAnalysisPublished:', error);
        throw error;
    }
});
/**
 * On Bookmark Created
 * Trigger: New document in Bookmarks collection
 * Purpose: Increment bookmark count on post
 */
exports.onBookmarkCreated = functions.firestore
    .document('bookmarks/{bookmarkId}')
    .onCreate(async (snap, context) => {
    const bookmark = snap.data();
    try {
        await db.doc(`AnalysisPosts/${bookmark.postId}`).update({
            bookmarks: admin.firestore.FieldValue.increment(1)
        });
        console.log(`Incremented bookmarks for post ${bookmark.postId}`);
    }
    catch (error) {
        console.error('Error incrementing bookmarks:', error);
    }
});
/**
 * On Bookmark Deleted
 * Trigger: Document deleted in Bookmarks collection
 * Purpose: Decrement bookmark count on post
 */
exports.onBookmarkDeleted = functions.firestore
    .document('bookmarks/{bookmarkId}')
    .onDelete(async (snap, context) => {
    const bookmark = snap.data();
    try {
        await db.doc(`AnalysisPosts/${bookmark.postId}`).update({
            bookmarks: admin.firestore.FieldValue.increment(-1)
        });
        console.log(`Decremented bookmarks for post ${bookmark.postId}`);
    }
    catch (error) {
        console.error('Error decrementing bookmarks:', error);
    }
});
/**
 * On User Created
 * Trigger: New user created in Firebase Auth
 * Purpose: Initialize Firestore user document
 */
exports.onUserCreated = functions.auth.user()
    .onCreate(async (user) => {
    console.log(`Creating Firestore document for user ${user.uid}`);
    try {
        const nextResetDate = new Date();
        nextResetDate.setDate(nextResetDate.getDate() + 30);
        await db.collection('users').doc(user.uid).set({
            id: user.uid,
            email: user.email || '',
            displayName: user.displayName || 'Trader',
            photoURL: user.photoURL || null,
            // Default preferences
            theme: 'auto',
            notificationPreferences: {
                watchlistUpdates: true,
                highConfidence: true,
                priceAlerts: true
            },
            defaultAssetFilter: 'all',
            // User data
            watchlist: [],
            fcmToken: null,
            // Freemium quota system
            plan: 'free',
            customReportsRemaining: 5,
            customReportsResetDate: admin.firestore.Timestamp.fromDate(nextResetDate),
            totalCustomReports: 0,
            // Metadata
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            lastLogin: admin.firestore.FieldValue.serverTimestamp(),
            onboardingCompleted: false
        });
        console.log(`Successfully created user document for ${user.uid}`);
    }
    catch (error) {
        console.error('Error creating user document:', error);
        throw error;
    }
});
// ============================================================================
// ANALYTICS & UTILITY FUNCTIONS
// ============================================================================
/**
 * Track User Analytics
 * Callable function for client-side analytics tracking
 */
exports.trackAnalytics = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { eventType, metadata } = data;
    try {
        await db.collection('analytics').add({
            userId: context.auth.uid,
            eventType,
            metadata: metadata || {},
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        return { success: true };
    }
    catch (error) {
        console.error('Error tracking analytics:', error);
        throw new functions.https.HttpsError('internal', 'Failed to track analytics');
    }
});
/**
 * Get User Stats
 * Callable function to get aggregated user statistics
 */
exports.getUserStats = functions.https.onCall(async (data, context) => {
    var _a, _b;
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    try {
        // Get bookmark count
        const bookmarksSnapshot = await db.collection('bookmarks')
            .where('userId', '==', userId)
            .get();
        // Get alert count
        const alertsSnapshot = await db.collection('price_alerts')
            .where('userId', '==', userId)
            .where('triggered', '==', false)
            .get();
        // Get user watchlist
        const userDoc = await db.collection('users').doc(userId).get();
        const watchlistCount = ((_b = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.watchlist) === null || _b === void 0 ? void 0 : _b.length) || 0;
        return {
            bookmarks: bookmarksSnapshot.size,
            activeAlerts: alertsSnapshot.size,
            watchlistItems: watchlistCount
        };
    }
    catch (error) {
        console.error('Error getting user stats:', error);
        throw new functions.https.HttpsError('internal', 'Failed to get user stats');
    }
});
//# sourceMappingURL=index.js.map