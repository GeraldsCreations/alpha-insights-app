# Research Orchestrator - Auto-Processing Setup

**Status:** ✅ LIVE (Feb 1, 2026 20:11 UTC)

## Overview

The Research Orchestrator automatically processes custom report requests in real-time by:
1. 👀 Monitoring `research_triggers` collection for new pending requests
2. 📊 Fetching real market data from CoinGecko (crypto) and Yahoo Finance (stocks)
3. 🤖 Spawning OpenClaw research agents (optional - TypeScript pipeline)
4. 🔬 Generating professional HTML analysis reports
5. 💾 Saving to `research_reports` collection
6. ✅ Updating request status to "complete"
7. 🔔 Ready for push notifications

## Components

### 1. **research-orchestrator.js** (Main Service)
- Monitors Firestore for new research triggers
- Coordinates the entire research pipeline
- Real-time Firestore listener
- Runs as systemd service (always on)

### 2. **market-data-api.js** (Data Layer)
- CoinGecko API integration (crypto)
- Yahoo Finance API integration (stocks)
- Technical indicator calculations (RSI, MACD, trend)
- Price level analysis

### 3. **scripts/research-orchestrator.ts** (Advanced Pipeline)
- TypeScript-based agent orchestrator
- Spawns 6 research agents via OpenClaw
- Full technical + fundamental analysis
- Integrates with existing research output

### 4. **Systemd Service** (Deployment)
- Service: `alpha-insights-orchestrator.service`
- Auto-starts on boot
- Auto-restarts on failure
- Logs to journalctl

## Architecture

```
User submits custom request
          ↓
Firebase Function creates trigger
          ↓
research_triggers collection (status: pending)
          ↓
Orchestrator detects new trigger ← [REAL-TIME MONITORING]
          ↓
Fetch market data (CoinGecko/Yahoo)
          ↓
Calculate technical indicators
          ↓
Generate HTML report
          ↓
Save to research_reports
          ↓
Update trigger (status: complete)
          ↓
Update custom_report_requests (status: complete)
          ↓
User sees new report in feed!
```

## Market Data Sources

### CoinGecko API (Crypto)
- **Endpoint:** `https://api.coingecko.com/api/v3`
- **Rate Limit:** 30 calls/minute (free tier)
- **Data:**
  - Real-time prices
  - 24H/7D/30D price changes
  - Market cap & volume
  - ATH/ATL data
  - Community sentiment
  - Project descriptions

### Yahoo Finance API (Stocks)
- **Endpoint:** `https://query1.finance.yahoo.com/v8/finance/chart/`
- **Rate Limit:** Generous (no documented limit)
- **Data:**
  - Real-time quotes
  - OHLCV data
  - 52-week high/low
  - Market cap
  - Exchange info
  - Historical data

## Technical Indicators

Auto-calculated from market data:
- **RSI (14):** Simplified calculation based on price momentum
- **MACD:** Bullish/bearish crossover signals
- **Trend Detection:** STRONG_LONG, LONG, NEUTRAL, SHORT, STRONG_SHORT
- **Price Position:** Percentage within 52-week range
- **Confidence Score:** 1-10 based on multiple factors
- **Volume Analysis:** Above/below average

## Report Format

Generated reports use **rich HTML** with professional styling:
- Lead paragraph with executive summary
- Technical indicators with color-coded sentiment
- Price level tables (52W high/low, current, targets)
- Callout boxes (info, success, warning, danger)
- Trading recommendations with entry/stop/target
- Risk/reward ratios
- Confidence scores
- Comprehensive disclaimers

## Service Management

### Start Service
```bash
sudo systemctl start alpha-insights-orchestrator
```

### Stop Service
```bash
sudo systemctl stop alpha-insights-orchestrator
```

### Restart Service
```bash
sudo systemctl restart alpha-insights-orchestrator
```

### Check Status
```bash
sudo systemctl status alpha-insights-orchestrator
```

### View Logs (Live)
```bash
sudo journalctl -u alpha-insights-orchestrator -f
```

### View Logs (Last 100 lines)
```bash
sudo journalctl -u alpha-insights-orchestrator -n 100
```

### Enable Auto-Start on Boot
```bash
sudo systemctl enable alpha-insights-orchestrator
```
*(Already enabled)*

### Disable Auto-Start
```bash
sudo systemctl disable alpha-insights-orchestrator
```

## Testing

### Test Custom Report Request
1. Go to https://alpha-insights-84c51.web.app
2. Navigate to "Request Analysis"
3. Enter ticker (e.g., ETH, TSLA, AAPL)
4. Select asset type
5. Submit request

### Monitor Processing
```bash
# Watch logs in real-time
sudo journalctl -u alpha-insights-orchestrator -f

# Check database status
cd /root/.openclaw/workspace/alpha-insights-app
node check-db.js
node check-reports.js
```

### Expected Flow
1. Request appears in `custom_report_requests` (status: pending)
2. Trigger created in `research_triggers` (status: pending)
3. Orchestrator detects trigger
4. Market data fetched (logs show price/RSI/trend)
5. Report generated (~2-5 seconds)
6. Report saved to `research_reports`
7. Trigger updated (status: complete)
8. Request updated (status: complete, reportId set)

## Upgrading to Full Pipeline

To use the advanced TypeScript pipeline with OpenClaw agents:

1. **Uncomment the pipeline integration** in `research-orchestrator.js`:
```javascript
// In processTrigger function, add:
await runResearchPipeline(ticker, assetType, requestId);
```

2. **Install dependencies**:
```bash
cd /root/.openclaw/workspace/alpha-insights-app/scripts
npm install
```

3. **Restart service**:
```bash
sudo systemctl restart alpha-insights-orchestrator
```

This will spawn 6 research agents:
- Technical Analyst
- News Analyst  
- World Events Analyst
- Price Action Specialist
- Verdict Analyst
- Report Writer

Processing time: ~5-10 minutes per ticker

## Performance

### Current (Lite Version)
- **Processing Time:** 2-5 seconds per request
- **Cost:** Free (public APIs)
- **Rate Limits:** CoinGecko 30/min, Yahoo unlimited
- **Concurrent Requests:** Limited by rate limits

### With Full Pipeline
- **Processing Time:** 5-10 minutes per request
- **Cost:** OpenAI API usage (~$0.10-0.50 per report)
- **Rate Limits:** OpenAI tier-dependent
- **Concurrent Requests:** Limited by agent availability

## Monitoring

### Health Checks
```bash
# Service running?
sudo systemctl is-active alpha-insights-orchestrator

# Any errors in last 50 lines?
sudo journalctl -u alpha-insights-orchestrator -n 50 | grep -i error

# Processing count
sudo journalctl -u alpha-insights-orchestrator | grep "Research completed" | wc -l
```

### Firestore Monitoring
```bash
# Check pending triggers
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./firebase-service-account.json')) });
admin.firestore().collection('research_triggers').where('status', '==', 'pending').get()
  .then(s => console.log('Pending triggers:', s.size))
  .then(() => process.exit(0));
"
```

## Troubleshooting

### Service won't start
```bash
# Check logs
sudo journalctl -u alpha-insights-orchestrator -n 100

# Check file permissions
ls -la /root/.openclaw/workspace/alpha-insights-app/research-orchestrator.js

# Test manually
cd /root/.openclaw/workspace/alpha-insights-app
node research-orchestrator.js
```

### No reports being generated
1. Check Firestore rules allow writes to `research_reports`
2. Verify service is running: `sudo systemctl status alpha-insights-orchestrator`
3. Check logs for errors: `sudo journalctl -u alpha-insights-orchestrator -f`
4. Test API access manually:
```bash
node -e "
const api = require('./market-data-api');
api.getMarketData('BTC', 'crypto').then(console.log);
"
```

### API rate limits
- CoinGecko: Free tier = 30 calls/minute
- Solution: Add delay between requests or upgrade CoinGecko plan
- Yahoo Finance: Very generous limits, unlikely to hit

## Future Enhancements

- [ ] AI-powered news sentiment analysis
- [ ] Historical backtesting data
- [ ] Chart image generation
- [ ] Social media sentiment integration
- [ ] Real-time price alerts integration
- [ ] Webhook notifications when reports complete
- [ ] Admin dashboard for monitoring
- [ ] Queue system for bulk processing
- [ ] Caching layer for repeated tickers

## Support

- **Logs:** `sudo journalctl -u alpha-insights-orchestrator -f`
- **Status:** `sudo systemctl status alpha-insights-orchestrator`
- **Config:** `/etc/systemd/system/alpha-insights-orchestrator.service`
- **Code:** `/root/.openclaw/workspace/alpha-insights-app/research-orchestrator.js`

---

**Last Updated:** Feb 1, 2026 20:11 UTC  
**Status:** ✅ Production Ready
