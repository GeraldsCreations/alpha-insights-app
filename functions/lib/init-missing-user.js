"use strict";
/**
 * Helper function to initialize a user document if it doesn't exist
 * This fixes the "User not found" error for existing auth users
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
exports.ensureUserDocument = ensureUserDocument;
const admin = __importStar(require("firebase-admin"));
const db = admin.firestore();
async function ensureUserDocument(userId, email) {
    const userRef = db.collection('Users').doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        console.log(`Creating missing user document for ${userId}`);
        const nextResetDate = new Date();
        nextResetDate.setDate(nextResetDate.getDate() + 30);
        await userRef.set({
            id: userId,
            email: email || '',
            displayName: 'Trader',
            photoURL: null,
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
        console.log(`Successfully created user document for ${userId}`);
    }
}
//# sourceMappingURL=init-missing-user.js.map