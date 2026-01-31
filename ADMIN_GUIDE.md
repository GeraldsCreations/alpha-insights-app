# Admin Guide - Alpha Insights Research Coordinator

This guide covers administrative tasks for managing the Alpha Insights research orchestration system.

## Table of Contents

1. [User Management](#user-management)
2. [Quota Management](#quota-management)
3. [Custom Request Management](#custom-request-management)
4. [Monitoring & Analytics](#monitoring--analytics)
5. [System Maintenance](#system-maintenance)
6. [Troubleshooting](#troubleshooting)

---

## User Management

### View User Details

**Firestore Console:**
1. Go to Firebase Console → Firestore Database
2. Navigate to `Users` collection
3. Click on user document (UID)

**Key Fields:**
```javascript
{
  uid: "user-id",
  email: "user@example.com",
  plan: "free" | "premium",
  customReportsRemaining: 5,
  customReportsResetDate: Timestamp,
  totalCustomReports: 12,
  createdAt: Timestamp
}
```

### Manually Upgrade User to Premium

#### Method 1: Firestore Console (Manual)

1. Go to Firebase Console → Firestore Database
2. Navigate to `Users` collection
3. Find user by email or UID
4. Click "Edit" on the user document
5. Update the following fields:
   ```
   plan: "premium"
   customReportsRemaining: 10
   customReportsResetDate: [30 days from now]
   ```
6. Click "Update"

#### Method 2: Using Cloud Function (Programmatic)

Use the Firebase Admin SDK or call the Cloud Function directly:

```javascript
// Using Firebase Admin SDK
const admin = require('firebase-admin');
const db = admin.firestore();

async function upgradeToPremium(userId) {
  const nextResetDate = new Date();
  nextResetDate.setDate(nextResetDate.getDate() + 30);
  
  await db.collection('Users').doc(userId).update({
    plan: 'premium',
    customReportsRemaining: 10,
    customReportsResetDate: admin.firestore.Timestamp.fromDate(nextResetDate)
  });
  
  console.log(`User ${userId} upgraded to premium`);
}

// Usage
upgradeToPremium('USER_UID_HERE');
```

#### Method 3: Using the Cloud Function

Call the `setUserPremium` Cloud Function:

```bash
# Using curl (requires authentication token)
curl -X POST https://us-central1-YOUR-PROJECT.cloudfunctions.net/setUserPremium \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "data": {
      "userId": "USER_UID_HERE",
      "premium": true
    }
  }'
```

### Downgrade User to Free Plan

Same process as upgrade, but set:
```javascript
{
  plan: "free",
  customReportsRemaining: 5,
  customReportsResetDate: [30 days from now]
}
```

### Refund User Quota

If a custom request failed or needs to be refunded:

```javascript
await db.collection('Users').doc(userId).update({
  customReportsRemaining: admin.firestore.FieldValue.increment(1)
});
```

---

## Quota Management

### Check User Quota

**Firestore Console:**
- Navigate to `Users/{userId}`
- View `customReportsRemaining` field

**Using Cloud Function:**
The `getUserQuota` function provides detailed quota info.

### Monthly Quota Reset

The `resetMonthlyQuotas` Cloud Function runs **daily at midnight** and automatically resets quotas for users whose reset date has passed.

**Manually Trigger Reset for All Users:**

```javascript
const admin = require('firebase-admin');
const db = admin.firestore();

async function resetAllQuotas() {
  const usersSnapshot = await db.collection('Users').get();
  const batch = db.batch();
  
  usersSnapshot.docs.forEach(doc => {
    const userData = doc.data();
    const plan = userData.plan || 'free';
    const newQuota = plan === 'premium' ? 10 : 5;
    
    const nextResetDate = new Date();
    nextResetDate.setDate(nextResetDate.getDate() + 30);
    
    batch.update(doc.ref, {
      customReportsRemaining: newQuota,
      customReportsResetDate: admin.firestore.Timestamp.fromDate(nextResetDate)
    });
  });
  
  await batch.commit();
  console.log('All user quotas reset');
}
```

### Adjust Quota Limits

Edit the quota limits in `functions/src/quota-functions.ts`:

```typescript
const QUOTA_LIMITS = {
  free: 5,      // Free plan monthly limit
  premium: 10   // Premium plan monthly limit
};
```

After editing, redeploy Cloud Functions:

```bash
cd functions
npm run deploy
```

---

## Custom Request Management

### View All Custom Requests

**Firestore Console:**
- Navigate to `CustomReportRequests` collection
- Filter by `status` for specific states

**Common Queries:**

```javascript
// Get pending requests
db.collection('CustomReportRequests')
  .where('status', '==', 'pending')
  .orderBy('createdAt', 'desc')
  .get();

// Get failed requests
db.collection('CustomReportRequests')
  .where('status', '==', 'failed')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();

// Get requests for specific user
db.collection('CustomReportRequests')
  .where('userId', '==', 'USER_UID')
  .orderBy('createdAt', 'desc')
  .get();
```

### Manually Process Stuck Request

If a request is stuck in "processing" status:

1. **Check Research Triggers:**
   ```javascript
   db.collection('ResearchTriggers')
     .where('requestId', '==', 'REQUEST_ID')
     .get();
   ```

2. **Manually mark as complete or failed:**
   ```javascript
   await db.collection('CustomReportRequests').doc(requestId).update({
     status: 'failed',
     error: 'Manual intervention - request timed out',
     completedAt: admin.firestore.FieldValue.serverTimestamp()
   });
   
   // Refund the user
   await db.collection('Users').doc(userId).update({
     customReportsRemaining: admin.firestore.FieldValue.increment(1)
   });
   ```

### Delete Old Requests

Clean up old completed/failed requests (optional):

```javascript
const cutoffDate = new Date();
cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

const oldRequests = await db.collection('CustomReportRequests')
  .where('completedAt', '<', admin.firestore.Timestamp.fromDate(cutoffDate))
  .get();

const batch = db.batch();
oldRequests.docs.forEach(doc => {
  batch.delete(doc.ref);
});

await batch.commit();
console.log(`Deleted ${oldRequests.size} old requests`);
```

---

## Monitoring & Analytics

### Daily Batch Logs

View batch execution logs in the `BatchLogs` collection:

```javascript
db.collection('BatchLogs')
  .orderBy('timestamp', 'desc')
  .limit(30)
  .get();
```

**Key Metrics:**
- `totalTickers`: Number of tickers processed
- `successCount`: Successful analyses
- `failureCount`: Failed analyses
- `duration`: Total execution time (ms)
- `results`: Array of individual ticker results

### Custom Request Analytics

**Total Requests by Status:**

```javascript
// Count by status
const statuses = ['pending', 'processing', 'complete', 'failed'];

for (const status of statuses) {
  const count = await db.collection('CustomReportRequests')
    .where('status', '==', status)
    .count()
    .get();
  
  console.log(`${status}: ${count.data().count}`);
}
```

**Requests per User:**

```javascript
const requests = await db.collection('CustomReportRequests')
  .orderBy('createdAt', 'desc')
  .get();

const userCounts = {};
requests.docs.forEach(doc => {
  const userId = doc.data().userId;
  userCounts[userId] = (userCounts[userId] || 0) + 1;
});

console.log('Requests per user:', userCounts);
```

### Performance Metrics

Average processing time for custom requests:

```javascript
const completed = await db.collection('ResearchTriggers')
  .where('status', '==', 'complete')
  .limit(100)
  .get();

const durations = completed.docs.map(doc => doc.data().duration);
const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;

console.log(`Average processing time: ${(avgDuration / 1000).toFixed(1)}s`);
```

---

## System Maintenance

### Restart Research Monitor

```bash
# systemd
sudo systemctl restart alpha-insights-monitor
sudo systemctl status alpha-insights-monitor

# PM2
pm2 restart alpha-insights-monitor
pm2 logs alpha-insights-monitor
```

### Manually Trigger Daily Batch

```bash
cd /root/.openclaw/workspace/alpha-insights-app
npm run coordinator:daily
```

### Update Ticker Lists

Edit `scripts/research-coordinator.ts`:

```typescript
// Update top stocks list
const topStocks: Ticker[] = [
  { symbol: 'AAPL', type: 'stock', marketCap: 3000000000000, name: 'Apple Inc.' },
  { symbol: 'MSFT', type: 'stock', marketCap: 2800000000000, name: 'Microsoft Corporation' },
  // Add more tickers...
];
```

### Clear Research Output

```bash
cd /root/.openclaw/workspace/alpha-insights-app
rm -rf research-output/*
```

### Redeploy Cloud Functions

```bash
cd /root/.openclaw/workspace/alpha-insights-app/functions
npm run build
npm run deploy
```

Or deploy specific functions:

```bash
firebase deploy --only functions:checkAndDecrementQuota
firebase deploy --only functions:onCustomReportRequestCreated
```

---

## Troubleshooting

### Issue: Custom Requests Stuck in "Pending"

**Cause:** Research monitor not running or Firestore trigger not firing

**Solution:**
1. Check monitor status: `systemctl status alpha-insights-monitor`
2. Check `ResearchTriggers` collection - should have corresponding entries
3. Check Cloud Function logs for errors
4. Restart monitor service

### Issue: Quota Not Resetting

**Cause:** `resetMonthlyQuotas` function not running or incorrect reset dates

**Solution:**
1. Check Cloud Function logs for `resetMonthlyQuotas`
2. Verify cron schedule: `0 0 * * *` (daily at midnight)
3. Manually reset specific users if needed
4. Check `customReportsResetDate` values are correct

### Issue: Daily Batch Not Running

**Cause:** Cron job not configured or failing

**Solution:**
1. Check cron status: `openclaw cron list`
2. Check cron logs: `openclaw cron logs alpha-insights-daily-batch`
3. Manually run: `npm run coordinator:daily`
4. Check for errors in output

### Issue: Analysis Not Publishing to Firestore

**Cause:** Firebase credentials missing or publish script failing

**Solution:**
1. Verify `firebase-service-account.json` exists
2. Check research output files exist in `research-output/`
3. Run publish script manually: `npx ts-node scripts/publish-analysis.ts TICKER`
4. Check Firestore rules allow writes

### Issue: Users Not Receiving Notifications

**Cause:** FCM token missing or messaging service not configured

**Solution:**
1. Check user has `fcmToken` field set
2. Verify Firebase Cloud Messaging is enabled
3. Check notification preferences: `notificationPreferences.watchlistUpdates`
4. Review Cloud Function logs for messaging errors

---

## Security Best Practices

1. **Restrict Admin Functions**: Add admin role checks to `setUserPremium` function
2. **Monitor Quota Abuse**: Set up alerts for users requesting excessive custom reports
3. **Rate Limiting**: Implement rate limiting on custom request submissions
4. **Audit Logs**: Track all admin actions (upgrades, quota adjustments, etc.)

## Support Contacts

- **System Admin**: [admin email]
- **Firebase Console**: https://console.firebase.google.com
- **OpenClaw Docs**: https://docs.openclaw.com
- **Support Channel**: [Discord/Slack link]

---

**Last Updated:** 2025-01-31
