# Publishing Research Analysis to Firestore

This guide explains how to publish research pipeline output to the Firestore `AnalysisPosts` collection.

---

## Overview

The research team generates comprehensive stock/crypto analysis files in markdown format. The publishing script reads these files, parses them into the `AnalysisPost` data model, and publishes them to Firestore for consumption by the mobile app.

### Research Output Files

Each analysis consists of 6 markdown files in `research-output/`:

1. **`{TICKER}-report.md`** - Synthesized comprehensive report
2. **`{TICKER}-verdicts.md`** - Multi-timeframe trading verdicts (7 timeframes)
3. **`{TICKER}-technical-analysis.md`** - Chart patterns, indicators, trade setups
4. **`{TICKER}-news-analysis.md`** - Recent headlines and sentiment
5. **`{TICKER}-price-analysis.md`** - Price action and volume analysis
6. **`{TICKER}-world-events.md`** - Macro context and global events

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This installs:
- `ts-node` - TypeScript execution
- `@types/node` - Node.js type definitions
- `firebase-admin` - Firestore SDK (optional for preview mode)

### 2. Publish Analysis

```bash
npm run publish:research AAPL
```

Replace `AAPL` with any ticker symbol that has research files.

---

## How It Works

### Data Extraction

The script automatically extracts:

| Field | Source | Extraction Method |
|-------|--------|-------------------|
| **Title** | Ticker + Date | `AAPL Analysis - January 31, 2026` |
| **Recommendation** | Verdicts file | Parses 1-week verdict (BUY/SELL/HOLD) |
| **Confidence Level** | Verdicts file | High=8, Medium=6, Low=4 |
| **Entry/Stop/Target** | Technical Analysis | Regex parsing of trade setups |
| **Risk/Reward Ratio** | Calculated | `(target - entry) / (entry - stop)` |
| **Content** | All files | Stores full markdown content |
| **Search Terms** | Ticker + Title | Generates searchable keywords |

### Output Format

The script generates an `AnalysisPost` object matching the data model in `src/app/core/models/index.ts`:

```typescript
interface AnalysisPost {
  id: string;                      // {TICKER}-{timestamp}
  title: string;                   // "AAPL Analysis - January 31, 2026"
  ticker: string;                  // "AAPL"
  assetType: 'stock' | 'crypto';  // Detected from ticker
  recommendation: 'LONG' | 'SHORT' | 'NO_TRADE';
  confidenceLevel: number;         // 1-10 scale
  entry: number;                   // Entry price
  stop: number;                    // Stop loss
  target: number;                  // Target price
  riskRewardRatio: number;        // Calculated R:R
  
  content: {
    technicalAnalysis: string;     // Full markdown
    newsSummary: string;           // Full markdown
    detailedAnalysis: string;      // Report markdown
    charts: string[];              // Chart URLs (TODO)
  };
  
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
  searchTerms: string[];
  views: 0;
  bookmarks: 0;
  authorId: 'alpha-insights-research-team';
}
```

---

## Preview Mode

**If Firebase credentials are not configured**, the script runs in **preview mode**:

```bash
npm run publish:research AAPL
```

Output:
```
🔍 Reading research files...
   ✓ AAPL-report.md
   ✓ AAPL-verdicts.md
   ✓ AAPL-technical-analysis.md
   ✓ AAPL-news-analysis.md
   ✓ AAPL-price-analysis.md
   ✓ AAPL-world-events.md

📊 Parsing analysis data...
   ✓ Parsed 7 timeframe verdicts
   ✓ Recommendation: LONG
   ✓ Confidence: 8/10
   ✓ Entry: $259 | Stop: $250 | Target: $295
   ✓ Risk/Reward: 1:3.89

📋 PREVIEW MODE - No Firebase credentials configured
================================================================================
{
  "id": "AAPL-1738350000000",
  "title": "AAPL Analysis - January 31, 2026",
  "ticker": "AAPL",
  "recommendation": "LONG",
  "confidenceLevel": 8,
  "entry": 259,
  "stop": 250,
  "target": 295,
  "riskRewardRatio": 3.89,
  ...
}
================================================================================

💡 To publish to Firestore:
   1. Set up Firebase Admin SDK credentials
   2. Initialize Firebase in this script
   3. Run again to publish
```

---

## Production Mode (with Firebase)

### Setup Firebase Admin SDK

1. **Get Service Account Key:**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `firebase-admin-key.json` (add to `.gitignore`)

2. **Update `publish-analysis.ts`:**

```typescript
// Add at top of file after imports
import * as serviceAccount from '../firebase-admin-key.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  databaseURL: 'https://your-project.firebaseio.com'
});
```

3. **Publish to Firestore:**

```bash
npm run publish:research AAPL
```

Output:
```
🚀 Publishing to Firestore...
   ✓ Published successfully!
   📄 Document ID: AAPL-1738350000000
   🔗 Collection: AnalysisPosts

✅ Analysis published to Firestore!
```

---

## Error Handling

The script handles common errors gracefully:

### Missing Research Files
```bash
❌ Missing file: AAPL-technical-analysis.md
```
**Solution:** Ensure all 6 research files exist for the ticker.

### Invalid Ticker
```bash
❌ Usage: npm run publish:research <TICKER>
   Example: npm run publish:research AAPL
```
**Solution:** Provide a ticker symbol as argument.

### Firestore Connection Error
```bash
❌ Error publishing to Firestore:
Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication/...
```
**Solution:** Set up Firebase Admin SDK credentials (see Production Mode).

---

## Customization

### Adding Chart Generation

The script currently doesn't generate chart images. To add chart support:

1. **Install chart library:**
```bash
npm install chart.js canvas
```

2. **Generate charts in script:**
```typescript
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

async function generateCharts(ticker: string, data: any): Promise<string[]> {
  // Generate technical charts
  // Upload to Firebase Storage
  // Return URLs
}
```

3. **Update `content.charts` array**

### Detecting Asset Type

Currently hardcoded to `'stock'`. To auto-detect:

```typescript
function detectAssetType(ticker: string): 'stock' | 'crypto' {
  const cryptoTickers = ['BTC', 'ETH', 'SOL', 'DOGE', 'ADA'];
  return cryptoTickers.includes(ticker.toUpperCase()) ? 'crypto' : 'stock';
}
```

### Custom Parsing Logic

Modify extraction functions in `publish-analysis.ts`:
- `parseVerdicts()` - Verdict extraction
- `extractRecommendation()` - Trade direction logic
- `extractPriceTargets()` - Entry/stop/target parsing
- `extractConfidenceLevel()` - Confidence scoring

---

## Integration with Research Pipeline

The research team should:

1. **Generate all 6 files** before publishing
2. **Use consistent naming:** `{TICKER}-{file-type}.md`
3. **Follow markdown structure** (headers, formatting)
4. **Run publish script** after analysis is complete

### Automated Publishing

To automate publishing after research generation:

```bash
# In research pipeline script
npm run publish:research $TICKER
```

Or create a wrapper script:

```bash
#!/bin/bash
# scripts/research-and-publish.sh

TICKER=$1

# Run research pipeline
./run-research-analysis.sh $TICKER

# Publish to Firestore
npm run publish:research $TICKER
```

---

## Troubleshooting

### TypeScript Errors

```bash
error TS2307: Cannot find module 'fs'
```

**Solution:** Install Node.js types:
```bash
npm install --save-dev @types/node
```

### ts-node Not Found

```bash
sh: ts-node: command not found
```

**Solution:** Install ts-node:
```bash
npm install --save-dev ts-node
```

### Firebase Admin Import Error

```bash
⚠️  firebase-admin not installed. Running in preview mode.
```

**Solution:** This is expected if Firebase isn't configured yet. The script will show a preview instead of publishing.

To install Firebase Admin:
```bash
npm install firebase-admin
```

---

## Future Enhancements

- [ ] Chart generation and Firebase Storage upload
- [ ] Batch publishing (multiple tickers at once)
- [ ] Update existing posts instead of creating duplicates
- [ ] Notification triggers after publishing
- [ ] Version history tracking
- [ ] Automated research → publish pipeline
- [ ] Web dashboard for managing published analyses

---

## File Structure

```
alpha-insights-app/
├── research-output/          # Research markdown files
│   ├── AAPL-report.md
│   ├── AAPL-verdicts.md
│   ├── AAPL-technical-analysis.md
│   ├── AAPL-news-analysis.md
│   ├── AAPL-price-analysis.md
│   └── AAPL-world-events.md
│
├── scripts/                  # Publishing scripts
│   ├── tsconfig.json        # TypeScript config for scripts
│   └── publish-analysis.ts  # Main publish script
│
├── docs/
│   └── PUBLISH_RESEARCH.md  # This file
│
├── src/app/core/models/
│   └── index.ts             # AnalysisPost data model
│
└── package.json             # npm scripts
```

---

## Support

For questions or issues:
1. Check this documentation
2. Review `publish-analysis.ts` comments
3. Contact the backend dev team
4. Open an issue in the repo

---

**Last Updated:** January 31, 2026  
**Maintained By:** Backend Dev Team  
**Version:** 1.0.0
