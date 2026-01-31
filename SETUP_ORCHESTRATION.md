# Quick Setup Guide - Research Coordinator

This guide will get the Research Coordinator orchestration system up and running in 10 minutes.

## Prerequisites

- [x] Firebase project created
- [x] Firebase Admin SDK credentials downloaded
- [x] OpenClaw installed
- [x] Node.js and npm installed

## Step 1: Install Dependencies

```bash
cd /root/.openclaw/workspace/alpha-insights-app

# Install main app dependencies
npm install

# Install Cloud Functions dependencies
cd functions
npm install
cd ..
```

## Step 2: Configure Firebase Credentials

Place your Firebase Admin SDK service account JSON file in the project root:

```bash
# Copy your service account file
cp /path/to/firebase-service-account.json /root/.openclaw/workspace/alpha-insights-app/
```

**Or download from Firebase Console:**
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save as `firebase-service-account.json` in project root

## Step 3: Deploy Cloud Functions

```bash
cd /root/.openclaw/workspace/alpha-insights-app/functions

# Build TypeScript
npm run build

# Deploy to Firebase
npm run deploy

# Or use Firebase CLI
firebase deploy --only functions
```

**Expected output:**
```
✔  functions: Finished running predeploy script.
✔  functions[checkAndDecrementQuota]: Successful create operation.
✔  functions[getUserQuota]: Successful create operation.
✔  functions[resetMonthlyQuotas]: Successful create operation.
✔  functions[setUserPremium]: Successful create operation.
✔  functions[onCustomReportRequestCreated]: Successful create operation.
✔  functions[onResearchTriggerCompleted]: Successful create operation.
✔  functions[submitCustomReportRequest]: Successful create operation.
✔  functions[getUserCustomRequests]: Successful create operation.
```

## Step 4: Set Up Daily Cron Job

Run the daily batch at 6 AM EST every day:

```bash
openclaw cron add \
  --schedule "0 6 * * *" \
  --timezone "America/New_York" \
  --command "cd /root/.openclaw/workspace/alpha-insights-app && npm run coordinator:daily" \
  --label "alpha-insights-daily-batch" \
  --description "Daily research for top 20 tickers"
```

**Verify:**
```bash
openclaw cron list
```

## Step 5: Start Custom Request Monitor

Choose one of these options:

### Option A: systemd (Recommended for Production)

1. Create service file:

```bash
sudo tee /etc/systemd/system/alpha-insights-monitor.service > /dev/null <<EOF
[Unit]
Description=Alpha Insights Custom Request Monitor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/alpha-insights-app
ExecStart=/usr/bin/npm run coordinator:monitor
Restart=always
RestartSec=10
StandardOutput=append:/var/log/alpha-insights-monitor.log
StandardError=append:/var/log/alpha-insights-monitor-error.log

[Install]
WantedBy=multi-user.target
EOF
```

2. Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable alpha-insights-monitor
sudo systemctl start alpha-insights-monitor
sudo systemctl status alpha-insights-monitor
```

### Option B: PM2 (Quick Setup)

```bash
cd /root/.openclaw/workspace/alpha-insights-app
pm2 start npm --name "alpha-insights-monitor" -- run coordinator:monitor
pm2 save
pm2 startup
```

### Option C: Manual (For Testing)

```bash
cd /root/.openclaw/workspace/alpha-insights-app
npm run coordinator:monitor
```

## Step 6: Update Firestore Security Rules

Add rules for the new collections:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ... existing rules ...
    
    // Custom Report Requests - users can read their own, create new ones
    match /CustomReportRequests/{requestId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
    }
    
    // Research Triggers - read-only for users, write for cloud functions
    match /ResearchTriggers/{triggerId} {
      allow read: if request.auth != null;
      allow write: if false; // Only cloud functions can write
    }
    
    // Batch Logs - read-only for admins
    match /BatchLogs/{logId} {
      allow read: if request.auth != null;
      allow write: if false;
    }
  }
}
```

Deploy rules:
```bash
firebase deploy --only firestore:rules
```

## Step 7: Build and Deploy Frontend

```bash
cd /root/.openclaw/workspace/alpha-insights-app

# Build for production
ng build --configuration production

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

## Step 8: Test the System

### Test 1: Single Ticker

```bash
npm run coordinator:test AAPL
```

**Expected output:**
```
🔬 Starting research for AAPL...
   ⏳ Running research agents for AAPL...
   ⏳ Publishing results for AAPL...
   ✅ Research complete for AAPL (145.2s)

Result: { ticker: 'AAPL', success: true, reportId: 'AAPL-1706745600000', duration: 145200 }
```

### Test 2: Custom Request Flow

1. Open app: `https://your-app.web.app/request-analysis`
2. Sign in with test account
3. Enter ticker: "TSLA"
4. Submit request
5. Check Firestore Console:
   - `CustomReportRequests` → New document (status: pending)
   - `ResearchTriggers` → New document (status: pending)
6. Wait 2-5 minutes
7. Check status changes to "complete"
8. View report in home feed

### Test 3: Quota System

1. Create new user account
2. Submit 5 custom requests (should work)
3. Try 6th request → Should show "No quota remaining"
4. Manually upgrade to premium (see ADMIN_GUIDE.md)
5. Submit 5 more requests (should work)

## Step 9: Monitor Logs

### Cron Job Logs
```bash
# OpenClaw cron logs
openclaw cron logs alpha-insights-daily-batch

# Or check system logs
tail -f /var/log/alpha-insights-daily.log
```

### Monitor Service Logs
```bash
# systemd
journalctl -u alpha-insights-monitor -f

# PM2
pm2 logs alpha-insights-monitor

# Manual
tail -f /var/log/alpha-insights-monitor.log
```

### Cloud Functions Logs
```bash
# Firebase CLI
firebase functions:log

# Or view in Firebase Console
# Functions → Logs
```

## Step 10: Verify Everything Works

### Checklist

- [ ] Cloud Functions deployed successfully
- [ ] Daily cron job scheduled
- [ ] Monitor service running
- [ ] Firestore rules updated
- [ ] Frontend deployed
- [ ] Test ticker analysis completes
- [ ] Custom request flow works end-to-end
- [ ] Quota system enforces limits
- [ ] Notifications sent (if FCM configured)
- [ ] Batch logs written to Firestore

---

## Troubleshooting

### Cloud Functions Not Deploying

**Issue:** Permission errors or deployment fails

**Solution:**
```bash
# Re-authenticate
firebase login

# Set project
firebase use YOUR_PROJECT_ID

# Try deploying individual functions
firebase deploy --only functions:checkAndDecrementQuota
```

### Cron Job Not Running

**Issue:** Cron job doesn't execute at scheduled time

**Solution:**
```bash
# Check OpenClaw cron status
openclaw cron status

# Manually trigger to test
npm run coordinator:daily

# Check timezone
date
# Should show EST time
```

### Monitor Not Picking Up Requests

**Issue:** Custom requests stay in "pending" status

**Solution:**
```bash
# Check service status
systemctl status alpha-insights-monitor

# Restart service
systemctl restart alpha-insights-monitor

# Check Firestore for triggers
# Firebase Console → Firestore → ResearchTriggers
```

### Research Pipeline Fails

**Issue:** Analysis doesn't publish to Firestore

**Solution:**
```bash
# Check Firebase credentials
ls -la firebase-service-account.json

# Test publish script manually
npx ts-node scripts/publish-analysis.ts AAPL

# Check research output files exist
ls -la research-output/
```

---

## Next Steps

1. **Set up monitoring**: Configure alerts for failures
2. **Test daily batch**: Wait for 6 AM or manually trigger
3. **Monitor quota usage**: Track user requests
4. **Set up premium upgrades**: Configure Stripe (future) or manual process
5. **Review admin guide**: Familiarize yourself with admin operations

---

## Support

- **Documentation**: See `ORCHESTRATION_COMPLETE.md` for full details
- **Admin Guide**: See `ADMIN_GUIDE.md` for management tasks
- **Cron Setup**: See `CRON_SETUP.md` for advanced cron configuration

---

**Setup Complete! 🎉**

Your Research Coordinator is now operational and ready to:
- Generate daily research for top 20 tickers
- Process custom user requests in real-time
- Manage freemium quotas automatically
- Send notifications to users

**Total setup time:** ~10-15 minutes

**Monitor your first daily batch tomorrow at 6 AM EST!**
