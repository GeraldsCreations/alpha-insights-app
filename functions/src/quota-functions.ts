/**
 * Quota Management Cloud Functions
 * 
 * Handles freemium quota system for custom research reports
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ============================================================================
// QUOTA CONSTANTS
// ============================================================================

const QUOTA_LIMITS = {
  free: 5,
  premium: 10
};

const QUOTA_RESET_INTERVAL_DAYS = 30;

// ============================================================================
// CALLABLE FUNCTIONS
// ============================================================================

/**
 * Check and Decrement User Quota
 * 
 * Callable function that checks if user has quota available,
 * decrements it if available, and returns success/failure
 */
export const checkAndDecrementQuota = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  const { ticker } = data;
  
  if (!ticker) {
    throw new functions.https.HttpsError('invalid-argument', 'Ticker is required');
  }
  
  try {
    const userRef = db.collection('Users').doc(userId);
    
    // Use transaction to ensure atomic quota check and decrement
    const result = await db.runTransaction(async (transaction) => {
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found');
      }
      
      const userData = userDoc.data()!;
      const quotaRemaining = userData.customReportsRemaining || 0;
      const plan = userData.plan || 'free';
      
      // Check if quota needs reset
      const resetDate = userData.customReportsResetDate?.toDate();
      const now = new Date();
      
      let shouldReset = false;
      if (!resetDate || now > resetDate) {
        shouldReset = true;
      }
      
      let newQuota = quotaRemaining;
      
      if (shouldReset) {
        // Reset quota to plan limit
        newQuota = QUOTA_LIMITS[plan as keyof typeof QUOTA_LIMITS];
        const nextResetDate = new Date();
        nextResetDate.setDate(nextResetDate.getDate() + QUOTA_RESET_INTERVAL_DAYS);
        
        transaction.update(userRef, {
          customReportsRemaining: newQuota,
          customReportsResetDate: admin.firestore.Timestamp.fromDate(nextResetDate)
        });
        
        console.log(`Reset quota for user ${userId}: ${newQuota} reports`);
      }
      
      // Check if user has quota available
      if (newQuota <= 0) {
        return {
          success: false,
          quotaRemaining: 0,
          plan,
          message: 'No quota remaining. Please upgrade to premium for more reports.'
        };
      }
      
      // Decrement quota
      transaction.update(userRef, {
        customReportsRemaining: admin.firestore.FieldValue.increment(-1),
        totalCustomReports: admin.firestore.FieldValue.increment(1)
      });
      
      return {
        success: true,
        quotaRemaining: newQuota - 1,
        plan,
        message: 'Quota decremented successfully'
      };
    });
    
    return result;
    
  } catch (error: any) {
    console.error('Error checking quota:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Get User Quota Status
 * 
 * Returns current quota information for the user
 */
export const getUserQuota = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const userId = context.auth.uid;
  
  try {
    const userDoc = await db.collection('Users').doc(userId).get();
    
    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }
    
    const userData = userDoc.data()!;
    const plan = userData.plan || 'free';
    const quotaRemaining = userData.customReportsRemaining || 0;
    const resetDate = userData.customReportsResetDate?.toDate();
    const totalReports = userData.totalCustomReports || 0;
    
    return {
      plan,
      quotaRemaining,
      quotaLimit: QUOTA_LIMITS[plan as keyof typeof QUOTA_LIMITS],
      resetDate: resetDate?.toISOString(),
      totalReports
    };
    
  } catch (error: any) {
    console.error('Error getting quota:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Reset Monthly Quotas
 * 
 * Scheduled function that runs monthly to reset quotas
 * for users whose reset date has passed
 */
export const resetMonthlyQuotas = functions.pubsub
  .schedule('0 0 * * *')  // Run daily at midnight
  .timeZone('America/New_York')
  .onRun(async (context) => {
    console.log('Starting monthly quota reset check...');
    
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Find users whose reset date has passed
      const usersToReset = await db.collection('Users')
        .where('customReportsResetDate', '<=', now)
        .get();
      
      if (usersToReset.empty) {
        console.log('No users to reset');
        return null;
      }
      
      console.log(`Found ${usersToReset.size} users to reset`);
      
      const batch = db.batch();
      let resetCount = 0;
      
      for (const userDoc of usersToReset.docs) {
        const userData = userDoc.data();
        const plan = userData.plan || 'free';
        const newQuota = QUOTA_LIMITS[plan as keyof typeof QUOTA_LIMITS];
        
        const nextResetDate = new Date();
        nextResetDate.setDate(nextResetDate.getDate() + QUOTA_RESET_INTERVAL_DAYS);
        
        batch.update(userDoc.ref, {
          customReportsRemaining: newQuota,
          customReportsResetDate: admin.firestore.Timestamp.fromDate(nextResetDate)
        });
        
        resetCount++;
        
        // Firestore batch limit is 500 operations
        if (resetCount % 500 === 0) {
          await batch.commit();
          console.log(`Committed batch of 500 resets`);
        }
      }
      
      // Commit remaining updates
      if (resetCount % 500 !== 0) {
        await batch.commit();
      }
      
      console.log(`Successfully reset quotas for ${resetCount} users`);
      return { resetCount };
      
    } catch (error) {
      console.error('Error resetting quotas:', error);
      throw error;
    }
  });

/**
 * Admin: Set User to Premium
 * 
 * Callable function for admin to manually upgrade a user to premium
 */
export const setUserPremium = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  // TODO: Add admin role check
  // For now, any authenticated user can call this (insecure - fix in production)
  
  const { userId, premium } = data;
  
  if (!userId) {
    throw new functions.https.HttpsError('invalid-argument', 'userId is required');
  }
  
  try {
    const userRef = db.collection('Users').doc(userId);
    const plan = premium ? 'premium' : 'free';
    const quota = QUOTA_LIMITS[plan];
    
    const nextResetDate = new Date();
    nextResetDate.setDate(nextResetDate.getDate() + QUOTA_RESET_INTERVAL_DAYS);
    
    await userRef.update({
      plan,
      customReportsRemaining: quota,
      customReportsResetDate: admin.firestore.Timestamp.fromDate(nextResetDate)
    });
    
    console.log(`Set user ${userId} to ${plan} plan`);
    
    return {
      success: true,
      plan,
      quotaRemaining: quota
    };
    
  } catch (error: any) {
    console.error('Error setting user plan:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
