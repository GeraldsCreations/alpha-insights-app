/**
 * Helper function to initialize a user document if it doesn't exist
 * This fixes the "User not found" error for existing auth users
 */

import * as admin from 'firebase-admin';

const db = admin.firestore();

export async function ensureUserDocument(userId: string, email?: string): Promise<void> {
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
