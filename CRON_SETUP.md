# OpenClaw Cron Job Setup for Alpha Insights

This document explains how to set up the daily research coordinator cron job using OpenClaw.

## Overview

The Research Coordinator runs on two modes:
1. **Daily Batch**: Scheduled at 6 AM EST daily to research top 20 tickers
2. **Real-time Monitor**: Continuously monitors for custom user requests

## Prerequisites

- OpenClaw installed and configured
- Firebase Admin SDK credentials configured
- Research pipeline agents deployed

## Daily Batch Cron Job

### Option 1: Using OpenClaw Cron (Recommended)

Create a cron job that triggers at 6 AM EST every day:

```bash
openclaw cron add \
  --schedule "0 6 * * *" \
  --timezone "America/New_York" \
  --command "cd /root/.openclaw/workspace/alpha-insights-app && npm run coordinator:daily" \
  --label "alpha-insights-daily-batch" \
  --description "Daily research batch for top 20 tickers"
```

### Option 2: Using System Cron

Add to crontab (`crontab -e`):

```cron
# Alpha Insights Daily Research Batch
0 6 * * * cd /root/.openclaw/workspace/alpha-insights-app && npm run coordinator:daily >> /var/log/alpha-insights-daily.log 2>&1
```

### Verify Cron Job

Check that the cron job is registered:

```bash
openclaw cron list
```

You should see:
```
alpha-insights-daily-batch
  Schedule: 0 6 * * *
  Timezone: America/New_York
  Next run: [date/time]
```

## Real-time Custom Request Monitor

The custom request monitor should run continuously as a background service.

### Option 1: Using systemd (Linux)

Create service file `/etc/systemd/system/alpha-insights-monitor.service`:

```ini
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
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable alpha-insights-monitor
sudo systemctl start alpha-insights-monitor
sudo systemctl status alpha-insights-monitor
```

### Option 2: Using PM2 (Node Process Manager)

```bash
cd /root/.openclaw/workspace/alpha-insights-app
pm2 start npm --name "alpha-insights-monitor" -- run coordinator:monitor
pm2 save
pm2 startup
```

Monitor the process:

```bash
pm2 status
pm2 logs alpha-insights-monitor
```

### Option 3: Using OpenClaw Background Session

```bash
openclaw sessions spawn \
  --label "alpha-insights-monitor" \
  --background \
  --restart-on-exit \
  --command "cd /root/.openclaw/workspace/alpha-insights-app && npm run coordinator:monitor"
```

## Testing

### Test Single Ticker

```bash
cd /root/.openclaw/workspace/alpha-insights-app
npm run coordinator:test AAPL
```

### Test Daily Batch (Dry Run)

```bash
npm run coordinator:daily
```

This will process all 20 tickers and log results.

### Test Custom Request Flow

1. Submit a custom request via the app UI
2. Check Firestore for `ResearchTriggers` collection
3. Monitor logs: `tail -f /var/log/alpha-insights-monitor.log`
4. Verify the request completes and publishes to Firestore

## Monitoring & Logs

### View Cron Job Logs

```bash
# OpenClaw cron logs
openclaw cron logs alpha-insights-daily-batch

# System logs
tail -f /var/log/alpha-insights-daily.log
```

### View Monitor Logs

```bash
# systemd
journalctl -u alpha-insights-monitor -f

# PM2
pm2 logs alpha-insights-monitor

# Manual logs
tail -f /var/log/alpha-insights-monitor.log
```

### Firestore Monitoring

Check `BatchLogs` collection in Firestore for daily batch results:

```javascript
// Firebase Console Query
db.collection('BatchLogs')
  .orderBy('timestamp', 'desc')
  .limit(10)
  .get()
```

## Troubleshooting

### Cron Job Not Running

1. Check cron is enabled: `systemctl status cron`
2. Check OpenClaw cron status: `openclaw cron status`
3. Verify timezone: `date` should show correct EST time
4. Check logs for errors

### Monitor Not Picking Up Requests

1. Verify Firestore credentials are configured
2. Check `ResearchTriggers` collection exists
3. Verify monitor service is running: `systemctl status alpha-insights-monitor`
4. Check for errors in logs

### Research Pipeline Fails

1. Check research output directory exists: `ls -la research-output/`
2. Verify Firebase Admin SDK credentials
3. Check network connectivity to APIs (CoinGecko, etc.)
4. Review error logs for specific failures

## Configuration

Edit `scripts/research-coordinator.ts` to customize:

```typescript
const CONFIG = {
  DAILY_CRYPTO_COUNT: 10,   // Number of crypto tickers
  DAILY_STOCK_COUNT: 10,     // Number of stock tickers
  RESEARCH_OUTPUT_DIR: '...',
  COINGECKO_API: '...',
  YAHOO_FINANCE_API: '...'
};
```

## Scaling Considerations

- **Concurrency**: Currently processes tickers sequentially. Can parallelize for faster execution.
- **Rate Limits**: Add API rate limiting if processing many tickers
- **Resource Usage**: Monitor CPU/memory usage during batch runs
- **Cloud Functions**: Quota limits on custom requests (check Firebase pricing)

## Manual Operations

### Trigger Daily Batch Manually

```bash
npm run coordinator:daily
```

### Process Single Custom Request

```bash
npm run coordinator:test <TICKER>
```

### Restart Monitor

```bash
# systemd
sudo systemctl restart alpha-insights-monitor

# PM2
pm2 restart alpha-insights-monitor
```

## Next Steps

1. Set up monitoring alerts (email/Slack on failures)
2. Implement retry logic for failed tickers
3. Add performance metrics tracking
4. Set up backup/redundancy for critical cron jobs
