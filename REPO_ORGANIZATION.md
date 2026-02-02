# Alpha Insights Repository Organization

## Repository Structure

Everything for Alpha Insights is now in the **alpha-insights-app** GitHub repository: https://github.com/GeraldsCreations/alpha-insights-app

### Key Directories

```
alpha-insights-app/
├── agents/
│   └── research-team/          # 🆕 All 6 agent role definition files
│       ├── README.md           # Agent pipeline documentation
│       ├── world-events-analyst.md
│       ├── technical-analyst-enhanced.md
│       ├── news-analyst-enhanced.md
│       ├── price-analysis-enhanced.md
│       ├── report-writer.md
│       └── verdict-analyst-enhanced.md
│
├── scripts/
│   ├── research-orchestrator.ts    # Main orchestrator (updated paths)
│   ├── spawn-research-agents.ts
│   ├── research-coordinator.ts
│   ├── trigger-research.ts
│   └── publish-to-firestore.ts
│
├── research-output/               # Agent output files
│   ├── {ticker}-world-events.md
│   ├── {ticker}-technical-analysis.md
│   ├── {ticker}-news-analysis.md
│   ├── {ticker}-price-analysis.md
│   ├── {ticker}-report.md
│   └── {ticker}-verdicts.md
│
├── src/                           # Angular app source
├── functions/                     # Firebase Cloud Functions
└── www/                          # Built app for deployment
```

## What Was Changed

### Before
- Agent role files were scattered in `/root/.openclaw/workspace/agents/alpha-insights-team/research-team/`
- Not in any git repo
- Hard to deploy or share

### After ✅
- All agent roles copied to `alpha-insights-app/agents/research-team/`
- Research orchestrator updated to reference repo path
- Everything committed and pushed to GitHub
- Single source of truth for all research infrastructure

## Latest Commit

**Commit:** `e642436` - "Add research agents and scripts to repo"
**Date:** 2026-02-02 08:22 UTC
**Changes:**
- 17 files changed
- 3140 insertions, 296 deletions
- All 13 agent role files added
- README documentation added
- Paths updated in orchestrator

## How to Deploy

1. Clone the repo:
   ```bash
   git clone https://github.com/GeraldsCreations/alpha-insights-app.git
   cd alpha-insights-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up Firebase:
   ```bash
   firebase login
   firebase use --add
   ```

4. Deploy functions (includes research orchestrator):
   ```bash
   firebase deploy --only functions
   ```

5. Run research locally:
   ```bash
   cd scripts
   ts-node research-orchestrator.ts TSLA stock
   ```

## Agent Pipeline

See `agents/research-team/README.md` for complete documentation of the 6-agent research pipeline.

All agents now read their role definitions from files in the repo, making updates easy and version-controlled.

## Next Steps

- ✅ All research infrastructure in repo
- ✅ Paths updated for local references
- 🔄 Consider adding CI/CD pipeline
- 🔄 Add automated testing for agent outputs
- 🔄 Document deployment to production

---

**Repository:** https://github.com/GeraldsCreations/alpha-insights-app  
**Last Updated:** 2026-02-02 08:22 UTC  
**Maintainer:** Gereld 🍆
