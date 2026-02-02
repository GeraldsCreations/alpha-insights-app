# ⚡ Quick Reference Card

**Common commands and operations for Alpha Insights.**

---

## 🚀 Getting Started

```bash
# Clone repo
git clone https://github.com/GeraldsCreations/alpha-insights-app.git
cd alpha-insights-app

# Install dependencies
npm install
cd functions && npm install && cd ..
cd scripts && npm install && cd ..

# Setup Firebase
firebase login
firebase use --add

# Deploy
firebase deploy
```

---

## 🔧 OpenClaw

```bash
# Check status
openclaw status

# Start/stop/restart gateway
openclaw gateway start
openclaw gateway stop
openclaw gateway restart

# View logs
openclaw logs

# List active sessions
openclaw sessions list

# View config
cat ~/.openclaw/config.yaml
```

---

## 🤖 Research Orchestrator

### Manual Testing

```bash
cd ~/. openclaw/workspace/alpha-insights-app/scripts

# Run research for a ticker
ts-node research-orchestrator.ts TSLA stock
ts-node research-orchestrator.ts BTC crypto

# With custom trigger ID
ts-node research-orchestrator.ts AAPL stock trigger-abc123
```

### Service Management

```bash
# Check status
sudo systemctl status alpha-insights-orchestrator

# Start/stop/restart
sudo systemctl start alpha-insights-orchestrator
sudo systemctl stop alpha-insights-orchestrator
sudo systemctl restart alpha-insights-orchestrator

# Enable/disable auto-start
sudo systemctl enable alpha-insights-orchestrator
sudo systemctl disable alpha-insights-orchestrator

# View logs (live)
sudo journalctl -u alpha-insights-orchestrator -f

# View logs (last N lines)
sudo journalctl -u alpha-insights-orchestrator -n 100

# Search logs
sudo journalctl -u alpha-insights-orchestrator | grep "error"
sudo journalctl -u alpha-insights-orchestrator | grep "TSLA"
```

---

## 🔥 Firebase

### Deploy Commands

```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only functions
firebase deploy --only hosting
firebase deploy --only firestore:rules

# Check what's deployed
firebase use
firebase projects:list
```

### Firestore Operations

```bash
# Check database status
node check-db.js
node check-reports.js

# Query collections (via Node.js)
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./firebase-service-account.json')) });

// List pending triggers
admin.firestore().collection('research_triggers')
  .where('status', '==', 'pending')
  .get()
  .then(s => {
    console.log('Pending triggers:', s.size);
    s.forEach(doc => console.log(doc.data()));
  })
  .then(() => process.exit(0));
"

# Count reports
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./firebase-service-account.json')) });
admin.firestore().collection('research_reports').get()
  .then(s => console.log('Total reports:', s.size))
  .then(() => process.exit(0));
"
```

---

## 🌐 Web App

### Development

```bash
cd ~/. openclaw/workspace/alpha-insights-app

# Run dev server
ionic serve
# Opens at http://localhost:8100

# Build for production
ionic build --prod

# Build for development
ionic build
```

### Check Build Output

```bash
# List built files
ls -lh www/

# Check size
du -sh www/

# Test built app locally
npx http-server www/
```

---

## 📊 Research Output

```bash
# Navigate to output directory
cd ~/. openclaw/workspace/alpha-insights-app/research-output

# List recent outputs
ls -lt | head -20

# Count completed analyses (verdicts = final step)
ls *-verdicts.md | wc -l

# View latest report
ls -t *-report.md | head -1 | xargs cat

# View specific ticker
cat TSLA-report.md
cat TSLA-verdicts.md

# Search outputs
grep -r "STRONG_LONG" .
grep -r "confidence.*10" .
```

---

## 🐛 Debugging

### Check OpenClaw Connection

```bash
# Test gateway API
curl -X POST http://localhost:18789/tools/invoke \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "sessions_list",
    "args": {}
  }'
```

### Test Market Data API

```bash
# Test CoinGecko (crypto)
node -e "
const api = require('./market-data-api');
api.getMarketData('BTC', 'crypto')
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(e => console.error('Error:', e));
"

# Test Yahoo Finance (stocks)
node -e "
const api = require('./market-data-api');
api.getMarketData('AAPL', 'stock')
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(e => console.error('Error:', e));
"
```

### Test Agent Spawn

```bash
cd scripts

# Spawn single agent
ts-node -e "
const http = require('http');

const postData = JSON.stringify({
  tool: 'sessions_spawn',
  args: {
    agentId: 'main',
    label: 'test-agent',
    task: 'Say hello and exit',
    cleanup: 'keep'
  }
});

const req = http.request({
  hostname: 'localhost',
  port: 18789,
  path: '/tools/invoke',
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  }
}, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
});

req.write(postData);
req.end();
"
```

### Check Agent Sessions

```bash
# Via OpenClaw CLI
openclaw sessions list

# Filter isolated sessions
openclaw sessions list --kind isolated

# View specific session history
openclaw sessions history <session-key>
```

---

## 📈 Monitoring

### System Health

```bash
# Check all services
sudo systemctl status alpha-insights-orchestrator
openclaw status
firebase projects:list

# Check disk space
df -h

# Check memory
free -h

# Check CPU
top -n 1 | head -15
```

### Application Metrics

```bash
# Count processing over time
sudo journalctl -u alpha-insights-orchestrator | grep "Research completed" | wc -l

# Success rate
sudo journalctl -u alpha-insights-orchestrator | grep -E "(completed|failed)" | \
  awk '/completed/{s++} /failed/{f++} END{print "Success: " s ", Failed: " f ", Rate: " (s/(s+f)*100) "%"}'

# Average processing time (rough)
sudo journalctl -u alpha-insights-orchestrator | grep "completed in" | \
  awk -F'in ' '{print $2}' | awk -F' minutes' '{sum+=$1; n++} END{print "Avg: " sum/n " minutes"}'
```

### Firebase Monitoring

Via Firebase Console:
- **Functions** → View logs, performance, error rate
- **Firestore** → Usage metrics, document counts
- **Hosting** → Bandwidth, requests
- **Authentication** → User signups, active users

---

## 🔍 Troubleshooting Quick Checks

### "No reports being generated"

```bash
# 1. Is orchestrator running?
sudo systemctl status alpha-insights-orchestrator

# 2. Any errors in logs?
sudo journalctl -u alpha-insights-orchestrator -n 50 | grep -i error

# 3. Is OpenClaw running?
openclaw status

# 4. Can we connect to Firebase?
node check-db.js

# 5. Test manually
node research-orchestrator.js
```

### "Agent timeout"

```bash
# 1. Check OpenClaw gateway
openclaw status
openclaw logs | tail -50

# 2. Check API keys
cat ~/.openclaw/config.yaml | grep apiKeys -A 5

# 3. Test agent spawn
cd scripts
ts-node research-orchestrator.ts TEST stock

# 4. Increase timeout in research-orchestrator.ts
# Edit timeoutMinutes for specific agents
```

### "Firebase connection failed"

```bash
# 1. Check service account file
ls -l firebase-service-account.json

# 2. Test Firebase connection
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./firebase-service-account.json')) });
admin.firestore().collection('research_reports').limit(1).get()
  .then(() => console.log('✅ Firebase connected'))
  .catch(e => console.error('❌ Connection failed:', e))
  .then(() => process.exit(0));
"

# 3. Check Firestore rules
firebase deploy --only firestore:rules
```

### "Web app not loading"

```bash
# 1. Rebuild app
ionic build --prod

# 2. Redeploy
firebase deploy --only hosting

# 3. Check hosting URL
firebase hosting:sites:list

# 4. Clear cache and reload
# Browser: Ctrl+Shift+R (hard reload)
```

---

## 🔐 Security Checklist

```bash
# Verify sensitive files are gitignored
cat .gitignore | grep -E "(environment|firebase-service-account|node_modules)"

# Check file permissions
ls -l firebase-service-account.json  # Should be -rw-------
ls -l ~/.openclaw/config.yaml         # Should be -rw-------

# Check Firestore rules
firebase deploy --only firestore:rules --dry-run

# Audit Firebase Console
# - Authentication: Only email/password enabled
# - Firestore: Rules in production mode
# - Functions: No public endpoints
```

---

## 📦 Backup & Recovery

### Backup Important Files

```bash
# Create backup directory
mkdir -p ~/alpha-insights-backup

# Backup configs
cp firebase-service-account.json ~/alpha-insights-backup/
cp src/environments/environment.ts ~/alpha-insights-backup/
cp ~/.openclaw/config.yaml ~/alpha-insights-backup/

# Backup research outputs
cp -r research-output ~/alpha-insights-backup/

# Backup agent roles
cp -r agents ~/alpha-insights-backup/

# Create tarball
tar -czf ~/alpha-insights-backup-$(date +%Y%m%d).tar.gz ~/alpha-insights-backup/
```

### Export Firestore Data

```bash
# Via gcloud (if installed)
gcloud firestore export gs://your-bucket/backups/$(date +%Y%m%d)

# Or via Firebase Console
# Firestore → Import/Export tab
```

### Restore from Backup

```bash
# Extract tarball
tar -xzf alpha-insights-backup-YYYYMMDD.tar.gz

# Restore files
cp ~/alpha-insights-backup/firebase-service-account.json .
cp ~/alpha-insights-backup/environment.ts src/environments/
cp ~/alpha-insights-backup/config.yaml ~/.openclaw/

# Restart services
sudo systemctl restart alpha-insights-orchestrator
openclaw gateway restart
```

---

## 🚨 Emergency Commands

### Stop Everything

```bash
# Stop orchestrator
sudo systemctl stop alpha-insights-orchestrator

# Stop OpenClaw
openclaw gateway stop

# Kill runaway processes
pkill -f "research-orchestrator"
pkill -f "openclaw"
```

### Reset Stuck Triggers

```bash
# Mark all pending triggers as failed
node -e "
const admin = require('firebase-admin');
admin.initializeApp({ credential: admin.credential.cert(require('./firebase-service-account.json')) });

admin.firestore().collection('research_triggers')
  .where('status', '==', 'pending')
  .get()
  .then(snapshot => {
    const batch = admin.firestore().batch();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { status: 'failed', error: 'Manual reset' });
    });
    return batch.commit();
  })
  .then(() => console.log('✅ Triggers reset'))
  .then(() => process.exit(0));
"
```

### Clean Up Old Sessions

```bash
# List all sessions
openclaw sessions list

# Delete specific session
openclaw sessions delete <session-key>

# Delete all isolated sessions (use carefully!)
openclaw sessions list --kind isolated --format json | \
  jq -r '.[].key' | \
  xargs -I {} openclaw sessions delete {}
```

---

## 📚 Documentation Links

- **Complete Deployment Guide:** `COMPLETE_DEPLOYMENT_GUIDE.md`
- **How It Works:** `HOW_IT_WORKS.md`
- **Repository Organization:** `REPO_ORGANIZATION.md`
- **Agent Roles:** `agents/research-team/README.md`
- **Orchestrator Setup:** `ORCHESTRATOR_SETUP.md`
- **Firebase Setup:** `FIREBASE_SETUP.md`

**Online Resources:**
- Repository: https://github.com/GeraldsCreations/alpha-insights-app
- OpenClaw Docs: https://docs.openclaw.ai
- Firebase Docs: https://firebase.google.com/docs
- Ionic Docs: https://ionicframework.com/docs

---

## 🎯 Common Workflows

### Deploy New Code

```bash
git pull origin master
npm install
ionic build --prod
firebase deploy
sudo systemctl restart alpha-insights-orchestrator
```

### Update Agent Roles

```bash
# Edit role file
nano agents/research-team/technical-analyst-enhanced.md

# Commit changes
git add agents/
git commit -m "Update technical analyst role"
git push origin master

# No service restart needed (roles read on each spawn)
```

### Add New Agent

1. Create role file: `agents/research-team/new-agent.md`
2. Update pipeline in `scripts/research-orchestrator.ts`
3. Test manually: `ts-node research-orchestrator.ts TEST stock`
4. Commit: `git add . && git commit -m "Add new agent" && git push`

### Monitor Live Request

```bash
# Terminal 1: Watch orchestrator
sudo journalctl -u alpha-insights-orchestrator -f

# Terminal 2: Watch output files
watch -n 5 'ls -lth research-output/ | head -10'

# Terminal 3: Watch Firestore
# (Via Firebase Console in browser)
```

---

**Last Updated:** 2026-02-02 09:05 UTC  
**Author:** Gereld 🍆  
**Keep this handy!** 📌
