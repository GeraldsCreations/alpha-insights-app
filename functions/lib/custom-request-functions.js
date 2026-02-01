"use strict";
/**
 * Custom Research Request Cloud Functions
 *
 * Handles real-time custom research requests from users
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
exports.getUserCustomRequests = exports.submitCustomReportRequest = exports.onResearchTriggerCompleted = exports.onCustomReportRequestCreated = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
// ============================================================================
// FIRESTORE TRIGGERS
// ============================================================================
/**
 * On Custom Report Request Created
 *
 * Triggers when a new custom report request is added to Firestore
 * Initiates the research pipeline via OpenClaw orchestrator
 */
exports.onCustomReportRequestCreated = functions.firestore
    .document('CustomReportRequests/{requestId}')
    .onCreate(async (snap, context) => {
    const request = snap.data();
    const requestId = context.params.requestId;
    console.log(`New custom report request: ${requestId} for ${request.ticker}`);
    try {
        // Update status to processing
        await snap.ref.update({
            status: 'processing',
            processingStartedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Trigger the research coordinator
        // This will be handled by the OpenClaw orchestrator
        // We create a trigger document that the orchestrator monitors
        await db.collection('ResearchTriggers').add({
            requestId,
            userId: request.userId,
            ticker: request.ticker,
            assetType: request.assetType,
            type: 'custom',
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Created research trigger for ${request.ticker}`);
        // Send notification to user
        await sendProcessingNotification(request.userId, request.ticker);
        return { success: true };
    }
    catch (error) {
        console.error('Error processing custom report request:', error);
        // Update request status to failed
        await snap.ref.update({
            status: 'failed',
            error: String(error),
            failedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        throw error;
    }
});
/**
 * On Research Trigger Completed
 *
 * Triggers when the research coordinator updates a trigger to 'complete'
 * Updates the custom request and notifies the user
 */
exports.onResearchTriggerCompleted = functions.firestore
    .document('ResearchTriggers/{triggerId}')
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Only process when status changes to complete
    if (before.status !== 'complete' && after.status === 'complete') {
        const { requestId, userId, ticker, reportId, error } = after;
        console.log(`Research trigger completed for ${ticker}`);
        try {
            if (requestId) {
                // Update custom report request
                const requestRef = db.collection('CustomReportRequests').doc(requestId);
                if (error) {
                    await requestRef.update({
                        status: 'failed',
                        error,
                        completedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    // Send error notification
                    await sendErrorNotification(userId, ticker, error);
                }
                else {
                    await requestRef.update({
                        status: 'complete',
                        reportId,
                        completedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    // Send completion notification
                    await sendCompletionNotification(userId, ticker, reportId);
                }
            }
            return { success: true };
        }
        catch (error) {
            console.error('Error updating custom request:', error);
            throw error;
        }
    }
    return null;
});
// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================
/**
 * Submit Custom Report Request
 *
 * Callable function for users to request custom research reports
 */
exports.submitCustomReportRequest = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    const { ticker, assetType } = data;
    if (!ticker || !assetType) {
        throw new functions.https.HttpsError('invalid-argument', 'ticker and assetType are required');
    }
    try {
        // Validate ticker format
        const tickerUpper = ticker.toUpperCase();
        if (!/^[A-Z]{1,5}$/.test(tickerUpper)) {
            throw new functions.https.HttpsError('invalid-argument', 'Invalid ticker format');
        }
        // Check for existing pending/processing request for this ticker
        const existingRequest = await db.collection('CustomReportRequests')
            .where('userId', '==', userId)
            .where('ticker', '==', tickerUpper)
            .where('status', 'in', ['pending', 'processing'])
            .limit(1)
            .get();
        if (!existingRequest.empty) {
            throw new functions.https.HttpsError('already-exists', 'You already have a pending request for this ticker');
        }
        // Create custom report request
        const requestRef = await db.collection('CustomReportRequests').add({
            userId,
            ticker: tickerUpper,
            assetType,
            status: 'pending',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Created custom report request: ${requestRef.id} for ${tickerUpper}`);
        return {
            success: true,
            requestId: requestRef.id,
            ticker: tickerUpper
        };
    }
    catch (error) {
        console.error('Error submitting custom report request:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
    }
});
/**
 * Get User's Custom Report Requests
 *
 * Returns list of custom requests for the authenticated user
 */
exports.getUserCustomRequests = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const userId = context.auth.uid;
    const { limit = 10, status } = data;
    try {
        let query = db.collection('CustomReportRequests')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(limit);
        if (status) {
            query = query.where('status', '==', status);
        }
        const snapshot = await query.get();
        const requests = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return { requests };
    }
    catch (error) {
        console.error('Error getting custom requests:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
// ============================================================================
// NOTIFICATION HELPERS
// ============================================================================
async function sendProcessingNotification(userId, ticker) {
    var _a;
    try {
        const userDoc = await db.collection('Users').doc(userId).get();
        const fcmToken = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
        if (!fcmToken) {
            console.log(`No FCM token for user ${userId}`);
            return;
        }
        const message = {
            notification: {
                title: 'Research Started 🔍',
                body: `Your ${ticker} analysis is being prepared. We'll notify you when it's ready!`
            },
            data: {
                type: 'custom_request_processing',
                ticker
            },
            token: fcmToken
        };
        await admin.messaging().send(message);
        console.log(`Sent processing notification to ${userId}`);
    }
    catch (error) {
        console.error(`Error sending processing notification:`, error);
    }
}
async function sendCompletionNotification(userId, ticker, reportId) {
    var _a;
    try {
        const userDoc = await db.collection('Users').doc(userId).get();
        const fcmToken = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
        if (!fcmToken) {
            console.log(`No FCM token for user ${userId}`);
            return;
        }
        const message = {
            notification: {
                title: `${ticker} Analysis Ready! ✅`,
                body: `Your custom research report is complete. Tap to view insights.`
            },
            data: {
                type: 'custom_request_complete',
                ticker,
                reportId
            },
            token: fcmToken
        };
        await admin.messaging().send(message);
        console.log(`Sent completion notification to ${userId}`);
    }
    catch (error) {
        console.error(`Error sending completion notification:`, error);
    }
}
async function sendErrorNotification(userId, ticker, error) {
    var _a;
    try {
        const userDoc = await db.collection('Users').doc(userId).get();
        const fcmToken = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
        if (!fcmToken) {
            console.log(`No FCM token for user ${userId}`);
            return;
        }
        const message = {
            notification: {
                title: `${ticker} Analysis Failed ❌`,
                body: 'We encountered an error generating your report. Your quota has been refunded.'
            },
            data: {
                type: 'custom_request_failed',
                ticker,
                error
            },
            token: fcmToken
        };
        await admin.messaging().send(message);
        console.log(`Sent error notification to ${userId}`);
        // Refund the user's quota
        await db.collection('Users').doc(userId).update({
            customReportsRemaining: admin.firestore.FieldValue.increment(1)
        });
    }
    catch (error) {
        console.error(`Error sending error notification:`, error);
    }
}
//# sourceMappingURL=custom-request-functions.js.map