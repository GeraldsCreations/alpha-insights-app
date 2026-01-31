# Research Coordinator - Quick Reference Card

## 🚀 Quick Commands

### Coordinator Operations
```bash
# Run daily batch (20 tickers)
npm run coordinator:daily

# Monitor custom requests (continuous)
npm run coordinator:monitor

# Test single ticker
npm run coordinator:test AAPL
```

### Cloud Functions
```bash
# Deploy all functions
cd functions && npm run deploy

# Deploy specific function
firebase deploy --only functions:checkAndDecrementQuota

# View logs
firebase functions:log
```

### Cron Job
```bash
# Add daily cron
openclaw cron add --schedule "0 6 * * *" --timezone "America/New_York" \
  --command "cd /root/.openclaw/workspace/alpha-insights-app && npm run coordinator:daily" \
  --label "alpha-insights-daily-batch"

# List cron jobs
openclaw cron list

# View logs
openclaw cron logs alpha-insights-daily-batch
```

### Monitor Service
```bash
# systemd
sudo systemctl start alpha-insights-monitor
sudo systemctl stop alpha-insights-monitor
sudo systemctl restart alpha-insights-monitor
sudo systemctl status alpha-insights-monitor
journalctl -u alpha-insights-monitor -f

# PM2
pm2 start npm --name "alpha-insights-monitor" -- run coordinator:monitor
pm2 stop alpha-insights-monitor
pm2 restart alpha-insights-monitor
pm2 logs alpha-insights-monitor
```

---

## 📁 Key Files

### Cloud Functions
- `functions/src/quota-functions.ts` - Quota management
- `functions/src/custom-request-functions.ts` - Custom requests
- `functions/src/index.ts` - Main exports

### Scripts
- `scripts/research-coordinator.ts` - Main orchestrator
- `scripts/publish-analysis.ts` - Firestore publisher

### Frontend
- `src/app/features/request-analysis/` - Request form page
- `src/app/core/services/custom-request.service.ts` - Frontend service
- `src/app/core/models/index.ts` - Data models

### Documentation
- `ORCHESTRATION_COMPLETE.md` - Full system docs
- `SETUP_ORCHESTRATION.md` - Quick setup guide
- `ADMIN_GUIDE.md` - Admin operations
- `CRON_SETUP.md` - Cron configuration
- `SUBAGENT_ORCHESTRATION_REPORT.md` - Build report

---

## 🔧 Admin Operations

### Upgrade User to Premium
```javascript
// Firestore Console
Users/{userId}
  plan: "premium"
  customReportsRemaining: 10
  customReportsResetDate: [+30 days]
```

### Refund Quota
```javascript
db.collection('Users').doc(userId).update({
  customReportsRemaining: admin.firestore.FieldValue.increment(1)
});
```

### Check Quota Status
```
Firestore → Users → {userId}
  customReportsRemaining: number
  customReportsResetDate: Timestamp
```

---

## 📊 Firestore Collections

### CustomReportRequests
```
Fields: userId, ticker, assetType, status, createdAt, reportId, error
Statuses: pending, processing, complete, failed
```

### ResearchTriggers
```
Fields: requestId, ticker, type, status, duration, completedAt
Types: daily, custom
Statuses: pending, processing, complete
```

### BatchLogs
```
Fields: totalTickers, successCount, failureCount, duration, results, timestamp
```

### Users (Extended)
```
Fields: plan, customReportsRemaining, customReportsResetDate, totalCustomReports
Plans: free (5/mo), premium (10/mo)
```

---

## 🔍 Monitoring Queries

### Pending Requests
```javascript
db.collection('CustomReportRequests')
  .where('status', '==', 'pending')
  .get();
```

### Failed Requests
```javascript
db.collection('CustomReportRequests')
  .where('status', '==', 'failed')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();
```

### Latest Batch Results
```javascript
db.collection('BatchLogs')
  .orderBy('timestamp', 'desc')
  .limit(1)
  .get();
```

---

## 🌐 Routes

- `/request-analysis` - Custom request form
- `/home` - Main feed (includes custom reports)
- `/analysis/:id` - Report detail page

---

## ⚙️ Configuration

### Quota Limits
```typescript
// functions/src/quota-functions.ts
const QUOTA_LIMITS = {
  free: 5,
  premium: 10
};
```

### Ticker Counts
```typescript
// scripts/research-coordinator.ts
const CONFIG = {
  DAILY_CRYPTO_COUNT: 10,
  DAILY_STOCK_COUNT: 10
};
```

---

## 🧪 Testing

### Test Flow
1. `npm run coordinator:test AAPL` - Single ticker
2. Submit custom request via `/request-analysis`
3. Check Firestore: `CustomReportRequests`, `ResearchTriggers`
4. Monitor logs: `journalctl -u alpha-insights-monitor -f`
5. Verify completion: status → "complete", report published

### Test Quota
1. New user: 5 reports
2. Submit 5 requests ✅
3. Submit 6th request ❌ (quota exhausted)
4. Upgrade to premium
5. Submit 5 more ✅

---

## 📞 Support

- **Full Docs**: `ORCHESTRATION_COMPLETE.md`
- **Setup Guide**: `SETUP_ORCHESTRATION.md`
- **Admin Guide**: `ADMIN_GUIDE.md`
- **Cron Setup**: `CRON_SETUP.md`

---

## 🎯 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Cron not running | `openclaw cron list`, check timezone |
| Monitor not picking up requests | `systemctl restart alpha-insights-monitor` |
| Quota not resetting | Check `resetMonthlyQuotas` function logs |
| Research fails | Check Firebase credentials, research output files |
| No notifications | Verify FCM token, check Cloud Function logs |

---

**Last Updated:** 2025-01-31  
**Version:** 1.0.0  
**Status:** Production Ready ✅
