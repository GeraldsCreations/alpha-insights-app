# 🚀 Complete Alpha Insights Deployment Guide

**Deploy Alpha Insights on a fresh OpenClaw instance from scratch.**

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [OpenClaw Setup](#openclaw-setup)
4. [Clone Repository](#clone-repository)
5. [Firebase Configuration](#firebase-configuration)
6. [Install Dependencies](#install-dependencies)
7. [Understanding the Agent Pipeline](#understanding-the-agent-pipeline)
8. [Run Research Manually](#run-research-manually)
9. [Deploy Orchestrator Service](#deploy-orchestrator-service)
10. [Deploy Firebase Functions](#deploy-firebase-functions)
11. [Deploy Web App](#deploy-web-app)
12. [Testing](#testing)
13. [Monitoring](#monitoring)
14. [Troubleshooting](#troubleshooting)

---

## Overview

**Alpha Insights** is an AI-powered stock/crypto research platform that:
- Uses 6 specialized AI agents to research tickers
- Generates professional WSJ-quality analysis reports
- Provides real-time price data and technical indicators
- Deploys as a web app with Firebase backend

**Tech Stack:**
- **OpenClaw** - AI agent orchestration framework
- **Firebase** - Backend (Firestore, Auth, Hosting, Functions)
- **Angular + Ionic** - Frontend web app
- **TypeScript** - Agent scripts and Firebase Functions
- **Node.js** - Research orchestrator service

---

## Prerequisites

### Required Software

1. **OpenClaw** (latest version)
   ```bash
   npm install -g openclaw
   openclaw --version
   ```

2. **Node.js 18+**
   ```bash
   node --version  # Should be v18.x or higher
   ```

3. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase --version
   ```

4. **Git**
   ```bash
   git --version
   ```

5. **ts-node** (for running TypeScript scripts)
   ```bash
   npm install -g ts-node typescript
   ```

### Required Accounts

1. **Firebase Account** (free tier works)
   - Create project at https://console.firebase.google.com
   - Enable Firestore, Authentication, Hosting, Functions

2. **OpenAI API Key** (for Claude/GPT agents)
   - Get from https://platform.openai.com/api-keys
   - Or use Anthropic API for Claude

3. **CoinGecko API** (optional, free tier)
   - For crypto price data
   - Free tier: 30 calls/minute

---

## OpenClaw Setup

### 1. Install OpenClaw Gateway

```bash
# Install OpenClaw
npm install -g openclaw

# Initialize config
openclaw init

# Start gateway
openclaw gateway start
```

### 2. Configure OpenClaw

Edit `~/.openclaw/config.yaml`:

```yaml
gateway:
  port: 18789
  token: "your-secure-token-here"  # Generate a secure random token

agents:
  default:
    model: "anthropic/claude-sonnet-4-5"  # Or your preferred model
    thinking: "low"
    
sessions:
  isolated:
    cleanup: "keep"  # Keep agent sessions for debugging
    timeout: 900000  # 15 minutes per agent

apiKeys:
  anthropic: "sk-ant-..."  # Your Anthropic API key
  # OR
  openai: "sk-..."  # Your OpenAI API key
```

### 3. Verify OpenClaw is Running

```bash
openclaw status

# Should show:
# ✅ Gateway running on port 18789
# ✅ Agents ready
```

---

## Clone Repository

```bash
# Navigate to workspace
cd ~/.openclaw/workspace

# Clone the repo
git clone https://github.com/GeraldsCreations/alpha-insights-app.git
cd alpha-insights-app

# Check what we have
ls -la
```

**Key directories:**
- `agents/research-team/` - AI agent role definitions (6 agents)
- `scripts/` - TypeScript orchestration scripts
- `src/` - Angular web app source
- `functions/` - Firebase Cloud Functions
- `research-output/` - Agent output files (gitignored in production)

---

## Firebase Configuration

### 1. Create Firebase Project

1. Go to https://console.firebase.google.com
2. Click "Add project"
3. Name: `alpha-insights` (or your choice)
4. Disable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Services

**Firestore:**
1. Navigate to **Firestore Database**
2. Click "Create database"
3. Choose **Production mode**
4. Select your region (e.g., us-central1)
5. Click "Enable"

**Authentication:**
1. Navigate to **Authentication**
2. Click "Get started"
3. Enable **Email/Password**
4. Click "Save"

**Hosting:**
1. Navigate to **Hosting**
2. Click "Get started"
3. Follow the setup wizard

### 3. Get Firebase Config

1. Click gear icon ⚙️ → **Project Settings**
2. Scroll to "Your apps" → Click web icon `</>`
3. Register app name: "alpha-insights-web"
4. Copy the `firebaseConfig` object

### 4. Create Environment Files

**Copy template:**
```bash
cd alpha-insights-app
cp environment.template.ts src/environments/environment.ts
cp src/environments/environment.ts src/environments/environment.prod.ts
```

**Edit `src/environments/environment.ts`:**
```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abc123",
    measurementId: "G-XXXXXXXXXX"
  }
};
```

**Edit `src/environments/environment.prod.ts`:**
```typescript
export const environment = {
  production: true,
  firebase: {
    // Same config as above
  }
};
```

### 5. Deploy Firestore Security Rules

```bash
firebase login
firebase use --add  # Select your project

# Deploy rules
firebase deploy --only firestore:rules
```

**Rules location:** `firestore.rules`

### 6. Initialize Firestore Collections

**Option A: Manually via Firebase Console**

Create these collections:
- `users`
- `posts`
- `research_reports`
- `research_triggers`
- `custom_report_requests`

**Option B: Script (automatic on first app use)**

Collections will auto-create when first document is written.

### 7. Get Firebase Service Account

For backend scripts and functions:

1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key"
3. Save as `firebase-service-account.json` in repo root
4. **Add to .gitignore!**

```bash
echo "firebase-service-account.json" >> .gitignore
```

---

## Install Dependencies

### 1. Install App Dependencies

```bash
cd ~/. openclaw/workspace/alpha-insights-app

# Install Angular/Ionic dependencies
npm install

# Install script dependencies
cd scripts
npm install
cd ..
```

### 2. Install Firebase Functions Dependencies

```bash
cd functions
npm install
cd ..
```

### 3. Verify Installations

```bash
# Check Angular CLI
npx ng version

# Check Firebase CLI
firebase --version

# Check TypeScript
npx tsc --version
```

---

## Understanding the Agent Pipeline

### Architecture

Alpha Insights uses **6 specialized AI agents** that work sequentially:

```
┌─────────────────────────────────────────────────────────────┐
│                     Research Orchestrator                     │
│          (scripts/research-orchestrator.ts)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │
                ┌───────────▼───────────┐
                │  1. World Events      │ (5 min)
                │     Analyst           │
                └───────────┬───────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼───────┐  ┌───────▼────────┐  ┌──────▼────────┐
│ 2. Technical  │  │ 3. News        │  │ 4. Price      │
│    Analyst    │  │    Analyst     │  │    Analyst    │
│    (8 min)    │  │    (8 min)     │  │    (8 min)    │
└───────┬───────┘  └───────┬────────┘  └──────┬────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                ┌───────────▼────────────┐
                │  5. Report Writer      │ (10 min)
                │     (synthesizes all)  │
                └───────────┬────────────┘
                            │
                ┌───────────▼────────────┐
                │  6. Verdict Analyst    │ (15 min)
                │     (final verdict)    │
                └────────────────────────┘
```

**Total pipeline time:** ~40-50 minutes per ticker

### Agent Roles

Each agent has a markdown role file in `agents/research-team/`:

1. **world-events-analyst.md**
   - Macro context, geopolitical risks, market sentiment
   - Output: `{ticker}-world-events.md`

2. **technical-analyst-enhanced.md**
   - Chart patterns, indicators, price action
   - Output: `{ticker}-technical-analysis.md`

3. **news-analyst-enhanced.md**
   - Recent news, earnings, web research with tables
   - Output: `{ticker}-news-analysis.md`

4. **price-analysis-enhanced.md**
   - Multi-timeframe dynamics, volatility, risk analysis
   - Output: `{ticker}-price-analysis.md`

5. **report-writer.md**
   - Synthesizes all findings into cohesive narrative
   - Output: `{ticker}-report.md`
   - **Depends on agents 1-4 completing**

6. **verdict-analyst-enhanced.md**
   - Final verdict, scenarios, confidence scores
   - Output: `{ticker}-verdicts.md`
   - **Depends on Report Writer**

### How Agents Work

1. **Orchestrator spawns agent** via OpenClaw API
2. **Agent reads role file** for instructions
3. **Agent uses tools:**
   - `web_search` - Find recent news/data
   - `web_fetch` - Extract article content
   - `Read` - Read previous agent outputs
   - `Write` - Save analysis to markdown file
4. **Agent completes** and signals orchestrator
5. **Orchestrator updates status** in Firebase
6. **Next dependent agent starts**

### Enhanced WSJ-Quality Features

The `-enhanced` roles include:
- ✅ Exact numbers, percentages, dollar amounts
- ✅ Historical context and comparisons
- ✅ Structured markdown tables
- ✅ Confidence scores (1-10)
- ✅ Risk quantification with specific metrics
- ✅ Multiple scenario analysis
- ✅ Professional tone (Wall Street Journal style)

---

## Run Research Manually

### Test the Pipeline

```bash
cd ~/. openclaw/workspace/alpha-insights-app/scripts

# Run research for a stock
ts-node research-orchestrator.ts TSLA stock

# Run research for crypto
ts-node research-orchestrator.ts BTC crypto

# With custom trigger ID (for concurrent requests)
ts-node research-orchestrator.ts AAPL stock trigger-12345
```

### What to Expect

```
🚀 Starting research pipeline for TSLA (stock)
📋 Output directory: /root/.openclaw/workspace/alpha-insights-app/research-output

📊 Agent Pipeline (6 agents):
  1. World Events Analyst (5 min timeout)
  2. Technical Analyst (8 min timeout)
  3. News Analyst (8 min timeout)
  4. Price Analysis Specialist (8 min timeout)
  5. Report Writer (10 min timeout) - depends on [1,2,3,4]
  6. Verdict Analyst (15 min timeout) - depends on [5]

🤖 [1/6] Spawning World Events Analyst...
✅ Agent spawned: sessionKey=agent:main:research-world-events-TSLA

[Agent produces output...]

✅ [1/6] World Events Analyst completed (3m 42s)
🤖 [2/6] Spawning Technical Analyst...
...
```

### Check Output Files

```bash
ls -la research-output/

# Should see:
# TSLA-world-events.md
# TSLA-technical-analysis.md
# TSLA-news-analysis.md
# TSLA-price-analysis.md
# TSLA-report.md
# TSLA-verdicts.md
```

### Read Final Report

```bash
cat research-output/TSLA-report.md
cat research-output/TSLA-verdicts.md
```

---

## Deploy Orchestrator Service

The orchestrator service monitors Firebase for new research requests and processes them automatically.

### 1. Update Orchestrator Config

Edit `research-orchestrator.js` (line 10-11):

```javascript
const GATEWAY_URL = 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = 'your-secure-token-here';  // Match your OpenClaw config
```

### 2. Test Orchestrator Manually

```bash
cd ~/. openclaw/workspace/alpha-insights-app
node research-orchestrator.js

# Should show:
# 🚀 Alpha Insights Research Orchestrator
# 📡 Connecting to Firebase...
# ✅ Firebase connected
# 👀 Monitoring research_triggers for new requests...
```

Leave it running and test with the web app (see Testing section).

### 3. Create Systemd Service

**Create service file:**

```bash
sudo nano /etc/systemd/system/alpha-insights-orchestrator.service
```

**Paste this:**

```ini
[Unit]
Description=Alpha Insights Research Orchestrator
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/.openclaw/workspace/alpha-insights-app
ExecStart=/usr/bin/node /root/.openclaw/workspace/alpha-insights-app/research-orchestrator.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
SyslogIdentifier=alpha-insights

[Install]
WantedBy=multi-user.target
```

**Enable and start:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable alpha-insights-orchestrator
sudo systemctl start alpha-insights-orchestrator
sudo systemctl status alpha-insights-orchestrator
```

### 4. Monitor Logs

```bash
# Live logs
sudo journalctl -u alpha-insights-orchestrator -f

# Last 100 lines
sudo journalctl -u alpha-insights-orchestrator -n 100

# Search for errors
sudo journalctl -u alpha-insights-orchestrator | grep -i error
```

---

## Deploy Firebase Functions

Firebase Functions handle:
- User authentication
- Custom report request creation
- Research trigger creation
- Report status updates

### 1. Configure Functions

Edit `functions/src/index.ts` if needed (usually works as-is).

### 2. Deploy Functions

```bash
cd ~/. openclaw/workspace/alpha-insights-app

# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:createCustomReportRequest
```

### 3. Verify Deployment

Check Firebase Console → Functions to see deployed functions:
- `createCustomReportRequest`
- `updateReportStatus`
- etc.

---

## Deploy Web App

### 1. Build the App

```bash
cd ~/. openclaw/workspace/alpha-insights-app

# Production build
ionic build --prod

# Or development build
ionic build
```

Output goes to `www/` directory.

### 2. Test Locally

```bash
# Serve locally
ionic serve

# Opens at http://localhost:8100
```

### 3. Deploy to Firebase Hosting

```bash
firebase deploy --only hosting

# Should output:
# ✔  Deploy complete!
# Hosting URL: https://your-project.web.app
```

### 4. Access Your App

Navigate to: `https://your-project.web.app`

---

## Testing

### End-to-End Test

1. **Open web app:** `https://your-project.web.app`

2. **Create account:**
   - Click "Sign Up"
   - Enter email/password
   - Verify account created in Firebase Console → Authentication

3. **Request custom analysis:**
   - Navigate to "Request Analysis" or "Custom Research"
   - Enter ticker: `TSLA`
   - Select type: `Stock`
   - Click "Submit Request"

4. **Monitor orchestrator:**
   ```bash
   sudo journalctl -u alpha-insights-orchestrator -f
   ```

5. **Expected flow:**
   ```
   📥 New research trigger detected: TSLA (stock)
   🔍 Fetching market data for TSLA...
   ✅ Market data retrieved (price: $245.32, RSI: 58)
   🤖 Spawning agent pipeline...
   📊 Agent 1/6: World Events Analyst...
   ✅ Agent 1/6 completed
   ...
   ✅ All 6 agents completed
   📝 Generating final report...
   💾 Report saved to Firestore (reportId: abc123)
   ✅ Research completed for TSLA
   ```

6. **Check report:**
   - Refresh web app
   - See new report in feed or "My Reports"
   - Click to view full analysis

### Unit Tests

**Test agent spawn:**
```bash
cd scripts
ts-node -e "
const { spawnAgentSession } = require('./research-orchestrator');
spawnAgentSession('test-agent', 'Analyze AAPL briefly')
  .then(r => console.log('✅ Agent spawned:', r))
  .catch(e => console.error('❌ Failed:', e));
"
```

**Test market data API:**
```bash
node -e "
const api = require('./market-data-api');
api.getMarketData('BTC', 'crypto')
  .then(d => console.log('✅ Data:', JSON.stringify(d, null, 2)))
  .catch(e => console.error('❌ Failed:', e));
"
```

**Test Firebase connection:**
```bash
node check-db.js
node check-reports.js
```

---

## Monitoring

### OpenClaw Gateway

```bash
# Check status
openclaw status

# View logs
openclaw logs

# List active sessions
openclaw sessions list
```

### Orchestrator Service

```bash
# Service status
sudo systemctl status alpha-insights-orchestrator

# Restart if needed
sudo systemctl restart alpha-insights-orchestrator

# Logs
sudo journalctl -u alpha-insights-orchestrator -f
```

### Firebase Console

- **Authentication:** See user signups
- **Firestore:** Monitor collections (posts, research_reports, etc.)
- **Hosting:** Check deployment status
- **Functions:** View function logs and performance

### Research Output

```bash
# List recent outputs
ls -lt research-output/ | head -20

# Count completed analyses
ls research-output/*-verdicts.md | wc -l

# View latest report
ls -t research-output/*-report.md | head -1 | xargs cat
```

---

## Troubleshooting

### OpenClaw Issues

**Problem:** Gateway not starting

```bash
# Check port not in use
sudo lsof -i :18789

# Kill conflicting process
sudo kill -9 <PID>

# Restart gateway
openclaw gateway restart
```

**Problem:** Agents timeout

- Increase timeout in agent pipeline config
- Check OpenAI/Anthropic API key is valid
- Monitor rate limits

### Orchestrator Issues

**Problem:** Service not processing requests

```bash
# Check service running
sudo systemctl status alpha-insights-orchestrator

# Check logs for errors
sudo journalctl -u alpha-insights-orchestrator -n 100 | grep -i error

# Test manually
cd ~/. openclaw/workspace/alpha-insights-app
node research-orchestrator.js
```

**Problem:** Firebase connection fails

- Verify `firebase-service-account.json` exists and is valid
- Check Firestore rules allow writes to `research_triggers` and `research_reports`
- Test Firebase connection:
  ```bash
  node check-db.js
  ```

### Agent Pipeline Issues

**Problem:** Agents not spawning

- Verify OpenClaw gateway is running
- Check `GATEWAY_TOKEN` matches config
- Test agent spawn manually:
  ```bash
  cd scripts
  ts-node research-orchestrator.ts TEST stock
  ```

**Problem:** Agents produce poor output

- Check agent role files for clarity
- Increase agent timeout
- Review agent thinking level in config
- Check model selection (Claude Sonnet 4.5 recommended)

### Web App Issues

**Problem:** App not connecting to Firebase

- Verify `environment.ts` has correct Firebase config
- Rebuild app: `ionic build --prod`
- Redeploy: `firebase deploy --only hosting`

**Problem:** Authentication not working

- Check Firebase Console → Authentication is enabled
- Verify Email/Password provider is active
- Check Firestore security rules

### Performance Issues

**Problem:** Research takes too long

- **Expected time:** 40-50 minutes per ticker
- **Optimize:** Run agents in parallel (requires code changes)
- **Alternative:** Use simplified orchestrator without full agent pipeline

**Problem:** API rate limits

- CoinGecko: Free tier = 30 calls/minute
  - **Solution:** Add delays or upgrade plan
- OpenAI/Anthropic: Tier-dependent
  - **Solution:** Upgrade API tier

---

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                         Web App                              │
│            (Angular + Ionic + Firebase)                      │
│           Hosted on Firebase Hosting                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   Firebase Backend                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │  Firestore  │  │    Auth     │  │  Functions  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Real-time listener
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           Research Orchestrator (Node.js)                    │
│              (Systemd service, always on)                    │
│                                                              │
│  • Monitors Firestore for new triggers                      │
│  • Fetches market data (CoinGecko, Yahoo)                   │
│  • Spawns agent pipeline via OpenClaw                       │
│  • Generates HTML reports                                   │
│  • Updates Firestore with results                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTP API
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   OpenClaw Gateway                           │
│              (Agent orchestration layer)                     │
│                                                              │
│  • Spawns isolated agent sessions                           │
│  • Provides tools (web_search, web_fetch, etc.)             │
│  • Monitors agent progress                                  │
│  • Returns results to orchestrator                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Spawns agents
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   6 AI Research Agents                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │ World Events │ │  Technical   │ │     News     │       │
│  │   Analyst    │ │   Analyst    │ │   Analyst    │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐       │
│  │    Price     │ │    Report    │ │   Verdict    │       │
│  │   Analyst    │ │    Writer    │ │   Analyst    │       │
│  └──────────────┘ └──────────────┘ └──────────────┘       │
│                                                              │
│  Each agent reads role files from agents/research-team/     │
│  Outputs markdown analysis to research-output/              │
└─────────────────────────────────────────────────────────────┘
```

---

## Cost Estimates

### Free Tier (Viable for MVP)

- **Firebase:** Free tier covers small-medium usage
- **CoinGecko:** Free tier (30 calls/min)
- **Yahoo Finance:** Free (unlimited)
- **OpenClaw:** Self-hosted (no licensing cost)

**Costs per research report:**
- OpenAI/Anthropic API: ~$0.50-$2.00 per ticker (6 agents, ~50K tokens)

### Scale Considerations

**100 reports/month:**
- API costs: ~$50-$200
- Firebase: Still free tier

**1000 reports/month:**
- API costs: ~$500-$2000
- Firebase: Upgrade to Blaze plan (~$25-$100/mo)
- Consider batch processing and caching

---

## Next Steps

- [ ] Set up monitoring/alerting (Sentry, Firebase Monitoring)
- [ ] Add caching layer for repeated tickers
- [ ] Implement queue system for bulk requests
- [ ] Add webhook notifications for report completion
- [ ] Create admin dashboard
- [ ] Set up CI/CD pipeline
- [ ] Add comprehensive test suite
- [ ] Document API endpoints
- [ ] Create user onboarding flow
- [ ] Optimize agent prompts for cost/quality

---

## Support Resources

- **Repository:** https://github.com/GeraldsCreations/alpha-insights-app
- **OpenClaw Docs:** https://docs.openclaw.ai
- **Firebase Docs:** https://firebase.google.com/docs
- **Ionic Docs:** https://ionicframework.com/docs

**Logs locations:**
- OpenClaw: `openclaw logs`
- Orchestrator: `sudo journalctl -u alpha-insights-orchestrator -f`
- Firebase Functions: Firebase Console → Functions → Logs
- Web app: Browser console

---

**Last Updated:** 2026-02-02 08:55 UTC  
**Version:** 1.0  
**Maintainer:** Gereld 🍆  
**Status:** ✅ Production Ready
