# Alpha Insights Research Orchestration System

**Status:** ✅ **COMPLETE & READY**

## Overview

Fully automated research factory that:
1. Monitors Firestore for new custom research requests
2. Spawns 6 research agents sequentially using OpenClaw
3. Updates Firestore in real-time with progress
4. Publishes complete reports to Firestore
5. Sends push notifications to users

---

## Architecture

```
User submits ticker in app
         ↓
Cloud Function: submitCustomReportRequest()
         ↓
Creates ResearchTrigger (status: 'pending') in Firestore
         ↓
Monitor Service detects new trigger
         ↓
Orchestrator spawns 6 agents sequentially:
  1. World Events Analyst (5min)
  2. Technical Analyst (5min)
  3. News Analyst (5min)
  4. Price Analysis Specialist (5min)
  5. Report Writer (10min) - synthesizes all
  6. Verdict Analyst (10min) - final verdicts
         ↓
Each agent writes .md file to research-output/
         ↓
Firestore updated after each agent completes:
  - currentAgent: "News Analyst"
  - completedAgents: ["world-events", "technical"]
  - progress: 33
         ↓
Publish script combines all .md files → Firestore
         ↓
ResearchTrigger updated (status: 'complete')
         ↓
Cloud Function: onResearchTriggerCompleted
         ↓
Sends push notification to user
```

---

## Setup Instructions

### 1. Firebase Service Account

**Get the service account key:**

1. Go to https://console.firebase.google.com
2. Select your Alpha Insights project
3. Click ⚙️ → "Project settings"
4. Go to "Service accounts" tab
5. Click "Generate new private key"
6. Download the JSON file
7. Rename it to `firebase-service-account.json`
8. Put it in: `/root/.openclaw/workspace/alpha-insights-app/`

**Security:**
```bash
# Ensure it's in .gitignore (already added)
cat .gitignore | grep firebase-service-account.json

# Verify permissions
chmod 600 firebase-service-account.json
```

### 2. Start the Monitor Service

**Option A: Run in Terminal (Testing)**
```bash
cd /root/.openclaw/workspace/alpha-insights-app
npm run coordinator:monitor
```

You'll see:
```
👂 Monitoring custom research requests...
👂 Listener active. Press Ctrl+C to stop.
```

**Option B: Run as Background Service (Production)**

Using **PM2**:
```bash
# Install PM2 globally
npm install -g pm2

# Start the monitor
pm2 start npm --name "alpha-insights-monitor" -- run coordinator:monitor

# Save PM2 process list
pm2 save

# Set to start on boot
pm2 startup

# View logs
pm2 logs alpha-insights-monitor

# Status
pm2 status
```

Using **systemd**:
```bash
# Create service file
sudo nano /etc/systemd/system/alpha-insights-monitor.service
```

```ini
[Unit]
Description=Alpha Insights Research Monitor
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/alpha-insights-app
ExecStart=/usr/bin/npm run coordinator:monitor
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable alpha-insights-monitor
sudo systemctl start alpha-insights-monitor

# Check status
sudo systemctl status alpha-insights-monitor

# View logs
sudo journalctl -u alpha-insights-monitor -f
```

---

## Usage

### User Flow (App)

1. User opens Alpha Insights app
2. Navigates to "Request Analysis" page (`/request-analysis`)
3. Searches for ticker (e.g., "TSLA")
4. Selects TSLA from autocomplete
5. Clicks "Submit Request"
6. App shows: "Your analysis is being prepared! We'll notify you when it's ready."

### Backend Flow (Automatic)

1. **Cloud Function fires** (`submitCustomReportRequest`)
   - Checks user quota
   - Decrements quota
   - Creates `ResearchTrigger` document:
     ```javascript
     {
       userId: "user123",
       ticker: "TSLA",
       assetType: "stock",
       status: "pending",
       createdAt: Timestamp
     }
     ```

2. **Monitor detects new trigger** (within 2-3 seconds)
   ```
   📨 Received 1 new research triggers
   🔬 Processing custom request for TSLA...
   ```

3. **Orchestrator spawns agents**
   ```
   🏭 RESEARCH ORCHESTRATION: TSLA (stock)
   
   🔬 Agent World Events Analyst
      ✓ Updated Firestore: World Events Analyst
      🚀 Spawning agent...
      ⏳ Waiting for output...
      ✅ Complete! (2.7KB)
   
   🔬 Agent Technical Analyst
      ✓ Updated Firestore: Technical Analyst
      🚀 Spawning agent...
      ⏳ Waiting for output...
      ✅ Complete! (5.8KB)
   
   ... (4 more agents)
   ```

4. **Firestore updates in real-time**
   ```javascript
   ResearchTriggers/xyz123: {
     status: "processing",
     currentAgent: "Report Writer",
     completedAgents: ["world-events", "technical", "news", "price"],
     progress: 67,
     updatedAt: Timestamp
   }
   ```

5. **Publish to AnalysisPosts**
   ```
   📤 Publishing results to Firestore...
   ✅ RESEARCH COMPLETE: TSLA
   Duration: 12.3 minutes
   Report ID: TSLA-1769892277684
   ```

6. **Cloud Function sends notification**
   ```javascript
   onResearchTriggerCompleted() {
     // Send push notification
     messaging.send({
       title: "TSLA Analysis Ready! ✅",
       body: "Your custom research report is complete.",
       data: { reportId: "TSLA-1769892277684" }
     })
   }
   ```

---

## Testing

### Manual Test (Without Firebase)

Test the orchestrator directly:

```bash
cd /root/.openclaw/workspace/alpha-insights-app

# Run orchestrator for TSLA
npm run orchestrate TSLA stock

# Watch output in real-time
# You'll see each agent spawn and complete
```

**Expected output:**
```
🏭 RESEARCH ORCHESTRATION: TSLA (stock)
🔬 Agent World Events Analyst
   🚀 Spawning agent...
   ⏳ Waiting for output...
   ✅ Complete! (2.7KB)
...
✅ RESEARCH COMPLETE: TSLA
Duration: 12.3 minutes
```

### Full Integration Test (With Firebase)

1. **Add Firebase credentials** (see Setup step 1)

2. **Start monitor:**
   ```bash
   npm run coordinator:monitor
   ```

3. **Create a test trigger manually in Firestore:**
   ```javascript
   // In Firebase Console → Firestore
   Collection: ResearchTriggers
   Add Document:
   {
     ticker: "AAPL",
     assetType: "stock",
     status: "pending",
     type: "custom",
     userId: "test-user-123",
     createdAt: [serverTimestamp]
   }
   ```

4. **Watch the monitor terminal:**
   ```
   📨 Received 1 new research triggers
   🔬 Processing custom request for AAPL...
   ```

5. **Check Firestore updates in real-time:**
   - Open Firestore console
   - Navigate to the ResearchTriggers document
   - Watch `currentAgent`, `progress`, `completedAgents` update

6. **Check AnalysisPosts collection when complete:**
   - Should have new `AAPL-[timestamp]` document
   - Contains full analysis with verdicts

---

## Firestore Schema

### ResearchTriggers Collection

```javascript
{
  id: "auto-generated",
  
  // Request info
  ticker: "TSLA",
  assetType: "crypto" | "stock",
  type: "daily" | "custom",
  
  // User info (for custom requests)
  userId: "user123",
  requestId: "custom-request-id",  // Links to CustomReportRequests
  
  // Status tracking
  status: "pending" | "processing" | "complete" | "failed",
  currentAgent: "News Analyst",
  completedAgents: ["world-events", "technical", "news"],
  progress: 50,  // Percentage (0-100)
  
  // Results
  success: true,
  reportId: "TSLA-1769892277684",
  duration: 738000,  // milliseconds
  error: null,
  
  // Timestamps
  createdAt: Timestamp,
  processingStartedAt: Timestamp,
  completedAt: Timestamp,
  updatedAt: Timestamp
}
```

### AnalysisPosts Collection

```javascript
{
  id: "TSLA-1769892277684",
  
  title: "TSLA Analysis - January 31, 2026",
  ticker: "TSLA",
  assetType: "stock",
  
  description: "Comprehensive multi-timeframe analysis...",
  
  content: {
    technicalAnalysis: "...",  // From technical-analyst.md
    newsSummary: "...",         // From news-analyst.md
    detailedAnalysis: "...",    // From report.md
    verdicts: "...",            // From verdicts.md (added to content)
    priceAnalysis: "..."        // From price-analysis.md
  },
  
  recommendation: "LONG" | "SHORT" | "NO_TRADE",
  entry: 430.41,
  stop: 412.00,
  target: 450.00,
  riskRewardRatio: 2.3,
  confidenceLevel: 6,  // 0-10 scale
  
  timestamp: Timestamp,
  views: 0,
  bookmarks: 0,
  
  searchTerms: ["TSLA", "tsla", "stock", "analysis"]
}
```

---

## Commands Reference

### Coordinator Commands

```bash
# Monitor mode (watches Firestore for new triggers)
npm run coordinator:monitor

# Daily batch (top 20 tickers at 6 AM)
npm run coordinator:daily

# Test single ticker
npm run coordinator:test AAPL
```

### Orchestrator Commands

```bash
# Run research for specific ticker
npm run orchestrate <TICKER> <ASSET_TYPE> [TRIGGER_ID]

# Examples:
npm run orchestrate TSLA stock
npm run orchestrate BTC crypto
npm run orchestrate AAPL stock trigger-xyz123  # With Firestore updates
```

### Publish Commands

```bash
# Publish specific ticker
npm run publish:research TSLA

# This reads research-output/TSLA-*.md files
# and publishes to Firestore AnalysisPosts
```

---

## Troubleshooting

### Monitor not detecting triggers

**Check:**
1. Firebase credentials: `ls firebase-service-account.json`
2. Firestore rules allow read on ResearchTriggers
3. Monitor is running: `pm2 status` or `ps aux | grep coordinator`

**Fix:**
```bash
# Restart monitor
pm2 restart alpha-insights-monitor

# View logs
pm2 logs alpha-insights-monitor --lines 100
```

### Agents timing out

**Symptoms:** "Timeout waiting for output file"

**Causes:**
- Network issues (web_search failures)
- Agent crashed
- OpenClaw session spawn failed

**Fix:**
```bash
# Check OpenClaw sessions
openclaw sessions list

# Check failed agent sessions
openclaw sessions list --kind isolated

# Increase timeout in research-orchestrator.ts:
# Change timeoutMinutes from 5 to 10 for slow agents
```

### Publish fails

**Error:** "Missing research file: TSLA-report.md"

**Cause:** Orchestrator didn't complete all agents

**Fix:**
```bash
# Check which files exist
ls -lh research-output/TSLA-*.md

# Re-run orchestrator for that ticker
npm run orchestrate TSLA stock

# Then publish manually
npm run publish:research TSLA
```

### Firestore updates not happening

**Check:**
1. Firebase Admin SDK initialized:
   ```bash
   # Should see this on startup:
   ✓ Updated Firestore: World Events Analyst
   
   # NOT:
   [Firestore disabled] Would update trigger...
   ```

2. Service account has permissions:
   - Cloud Firestore → Firestore Admin role

**Fix:**
```bash
# Verify service account file
cat firebase-service-account.json | jq .project_id

# Should match your Firebase project ID
```

---

## Performance & Scaling

### Current Throughput

- **Single ticker research:** ~10-15 minutes
- **Sequential processing:** 1 ticker at a time
- **Daily capacity:** ~100 tickers/day (running 24/7)

### Optimization Ideas

1. **Parallel agent execution** (non-dependent agents)
   - Run World Events + Technical + News + Price in parallel
   - Then Report Writer, then Verdict Analyst
   - **Reduction:** 15min → 8min per ticker

2. **Agent caching**
   - Cache world events / macro data (valid for 24h)
   - Reuse for multiple tickers
   - **Reduction:** 5min → 2min for world events

3. **Multiple coordinator instances**
   - Run 3 coordinators in parallel
   - Process 3 tickers simultaneously
   - **Capacity:** 300 tickers/day

4. **Priority queue**
   - Premium users processed first
   - Free users during off-peak hours

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Research Success Rate**
   ```javascript
   ResearchTriggers.where('status', '==', 'complete').count()
   / ResearchTriggers.count()
   ```
   **Target:** >95%

2. **Average Processing Time**
   ```javascript
   avg(ResearchTriggers.where('status', '==', 'complete').duration)
   ```
   **Target:** <15 minutes

3. **Agent Failure Rate**
   - Track which agents fail most
   - Improve those agents first

4. **User Satisfaction**
   - Track views/bookmarks on published reports
   - Collect feedback on analysis quality

### Dashboard Queries

```javascript
// Failed requests (last 24h)
db.collection('ResearchTriggers')
  .where('status', '==', 'failed')
  .where('createdAt', '>', yesterday)
  .orderBy('createdAt', 'desc')
  .get()

// Slow requests (>20 min)
db.collection('ResearchTriggers')
  .where('duration', '>', 1200000)
  .where('status', '==', 'complete')
  .get()

// Active processing
db.collection('ResearchTriggers')
  .where('status', '==', 'processing')
  .get()
```

---

## Next Steps

### Phase 1 (Current) ✅
- [x] Orchestration system
- [x] Real-time Firestore updates
- [x] Monitor service
- [x] Publish integration

### Phase 2 (Future)
- [ ] Parallel agent execution
- [ ] Priority queue for premium users
- [ ] Agent caching layer
- [ ] Retry logic for failed agents
- [ ] Email notifications (in addition to push)

### Phase 3 (Advanced)
- [ ] Multiple coordinator instances
- [ ] Load balancing
- [ ] Agent performance analytics
- [ ] A/B testing different agent prompts
- [ ] User feedback integration

---

## Support

**Issues?** Check:
1. Monitor logs: `pm2 logs alpha-insights-monitor`
2. OpenClaw sessions: `openclaw sessions list`
3. Firestore console: Check ResearchTriggers collection
4. Research output files: `ls research-output/`

**Contact:** Check AGENTS.md for team structure

---

**Built by:** OpenClaw Agent Workforce  
**Date:** January 31, 2026  
**Status:** ✅ Production Ready
