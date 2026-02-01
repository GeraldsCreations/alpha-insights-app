# Alpha Insights Firestore Schema Redesign
**Goal:** Eliminate ALL "UNKNOWN" values and deliver WSJ-quality structured data

---

## 📊 Current UI Components & Data Requirements

### 1. **Executive Summary Component**
**Required Fields:**
- `recommendation`: 'LONG' | 'SHORT' | 'NO_TRADE' ✅
- `confidenceLevel`: number (1-10) ✅
- `entry`, `target`, `stop`: number ✅
- `riskRewardRatio`: number ✅
- `content.detailedAnalysis`: string (for key insights extraction) ✅

**Current Issues:**
- Key insights extraction is fragile (relies on parsing markdown)
- No dedicated `keyInsights` field

### 2. **Verdict Timeline Component**
**Required Fields:**
- `verdicts`: Array<{timeframe, verdict, confidence}>

**Current Issues:**
- ❌ Timeframe name mismatch: DB has "5 Minute", UI expects "5-Min"
- ❌ Confidence type mismatch: DB has "High/Medium/Low" string, UI expects number
- ❌ Missing timeframes: DB has 7 timeframes, UI expects exactly 6
- **CRITICAL:** This causes ALL "UNKNOWN" verdicts

**Expected Timeframes:**
```typescript
['5-Min', '15-Min', '1-Hour', '4-Hour', 'Daily', 'Weekly']
```

**Current Database Timeframes:**
```
['5 Minute', '1 Hour', '4 Hour', '24 Hour', '1 Week', '1 Month', '1 Year']
```

### 3. **Price Levels Component**
**Required Fields:**
- `entry`: number ✅
- `target`: number ✅
- `stop`: number ✅
- `ticker`: string ✅

### 4. **TradingView Chart Component**
**Required Fields:**
- `ticker`: string ✅
- `entry`, `target`, `stop`: number ✅

---

## 🎯 Proposed New Schema

### **AnalysisPost Interface (Enhanced)**

```typescript
export interface AnalysisPost {
  id: string;
  title: string;
  heroImage: string;
  description: string;
  timestamp: Date;
  assetType: 'crypto' | 'stock' | 'commodity';
  ticker: string;
  
  // Full analysis content (structured)
  content: AnalysisContent;
  
  // Trading recommendation
  recommendation: 'LONG' | 'SHORT' | 'NO_TRADE';
  entry: number;
  stop: number;
  target: number;
  riskRewardRatio: number;
  confidenceLevel: number;  // 1-10
  
  // NEW: Structured verdicts for timeline
  verdicts: TimeframeVerdict[];
  
  // NEW: Executive summary data
  executiveSummary: ExecutiveSummary;
  
  // NEW: Market context
  marketContext: MarketContext;
  
  // Metadata
  authorId: string;
  views: number;
  bookmarks: number;
  searchTerms: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TimeframeVerdict {
  timeframe: '5-Min' | '15-Min' | '1-Hour' | '4-Hour' | 'Daily' | 'Weekly';
  verdict: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;  // 0-100 percentage
  reasoning: string;   // 1-2 sentences max
}

export interface ExecutiveSummary {
  keyInsights: string[];  // Array of 3-5 bullet points
  bottomLine: string;     // 1-2 sentence verdict
  riskAssessment: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  timeHorizon: '1-Week' | '1-Month' | '3-Month' | '6-Month+';
}

export interface MarketContext {
  currentPrice: number;
  priceChange24h: number;  // Percentage
  volume24h?: number;
  marketCap?: number;
  
  // Technical levels
  keySupport: number[];    // Array of 2-3 support levels
  keyResistance: number[]; // Array of 2-3 resistance levels
  
  // Sentiment
  overallSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  sentimentScore: number;  // -100 to +100
}

export interface AnalysisContent {
  // Long-form sections (markdown with tables)
  detailedAnalysis: string;
  technicalAnalysis: string;
  newsSummary: string;
  priceAnalysis: string;
  
  // Charts
  charts: string[];  // Firebase Storage URLs
  
  // NEW: Risk management table data
  riskMetrics?: RiskMetrics;
}

export interface RiskMetrics {
  positionSize: string;      // e.g., "1-2% of portfolio"
  stopLossDistance: number;  // Percentage from entry
  targetDistance: number;    // Percentage from entry
  maxDrawdown: number;       // Percentage
  volatility: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}
```

---

## 🔧 Required Changes

### 1. **Fix Verdict Timeframes**

**Problem:** Agents produce "5 Minute", "1 Hour", "24 Hour" but UI expects "5-Min", "1-Hour", "Daily"

**Solution:** Update agent prompts to use EXACT UI-expected names:

```markdown
### 5-Min
**Verdict:** BUY 🟢
**Confidence:** 80
**Reasoning:** Strong momentum with volume confirmation.

### 15-Min
**Verdict:** BUY 🟢
**Confidence:** 75
**Reasoning:** Uptrend intact with bullish candle patterns.

### 1-Hour
**Verdict:** HOLD 🟡
**Confidence:** 60
**Reasoning:** Consolidation near resistance, wait for breakout.

### 4-Hour
**Verdict:** BUY 🟢
**Confidence:** 85
**Reasoning:** Higher highs and higher lows pattern confirmed.

### Daily
**Verdict:** BUY 🟢
**Confidence:** 90
**Reasoning:** Golden cross, RSI bullish, volume increasing.

### Weekly
**Verdict:** BUY 🟢
**Confidence:** 85
**Reasoning:** Long-term uptrend intact, fundamentals strong.
```

### 2. **Convert Confidence to Numbers**

**Current:** "High", "Medium", "Low" (strings)
**New:** 80, 60, 40 (numbers 0-100)

**Parsing Logic:**
```typescript
function parseConfidence(text: string): number {
  // Extract number directly
  const numMatch = text.match(/(\d+)/);
  if (numMatch) return parseInt(numMatch[1]);
  
  // Fallback to keyword mapping
  if (text.includes('High')) return 80;
  if (text.includes('Medium')) return 60;
  if (text.includes('Low')) return 40;
  return 0;
}
```

### 3. **Add Key Insights Extraction**

**Current:** Fragile regex parsing of markdown
**New:** Dedicated section in agent output:

```markdown
## 📌 Key Insights

- **Technical Setup:** Price broke above $50,000 resistance with 2x average volume
- **Momentum:** RSI (14) at 65 with bullish divergence on 4H chart
- **Risk/Reward:** Excellent 1:3.5 ratio with tight stop at $48,200
- **Catalyst:** Fed dovish stance + institutional accumulation resuming
- **Timeframe:** Swing trade (7-14 day hold) targeting $58,500
```

### 4. **WSJ-Quality Writing Standards**

**Agent Prompts Must Enforce:**

✅ **Precision:** Use exact numbers, not vague terms ("Volume increased 240%" not "Volume spiked")
✅ **Context:** Always provide historical comparison ("Highest since March 2024")
✅ **Objectivity:** Present both bull and bear cases
✅ **Structure:** Use tables for data, prose for analysis
✅ **Brevity:** Max 2-3 sentences per insight

**Example Table Format:**

```markdown
| Metric | Current | 1-Week Ago | Change |
|--------|---------|------------|--------|
| Price | $52,340 | $48,120 | +8.8% |
| Volume (24h) | $28.4B | $18.2B | +56% |
| RSI (14) | 65 | 48 | +35% |
| MACD | Bullish Cross | Bearish | Reversal |
```

---

## 📝 Implementation Plan

### Phase 1: Update Agent Prompts (30 min)
**File:** `scripts/research-orchestrator.ts`

1. Update `verdicts` agent prompt to use exact UI timeframe names
2. Enforce numeric confidence (0-100)
3. Add "Key Insights" section requirement
4. Add markdown table requirements for data

### Phase 2: Update Publish Script (45 min)
**File:** `scripts/publish-to-firestore.ts`

1. Add `parseVerdicts()` function that:
   - Maps old timeframe names → new names
   - Converts confidence strings → numbers
   - Validates all 6 required timeframes exist

2. Add `parseKeyInsights()` function:
   - Extract "Key Insights" section
   - Return array of 3-5 strings

3. Add `parseMarketContext()` function:
   - Extract current price, volume, sentiment
   - Parse support/resistance levels from technical analysis

4. Add schema validation before Firestore write:
   ```typescript
   function validateAnalysisPost(post: Partial<AnalysisPost>): string[] {
     const errors: string[] = [];
     
     if (!post.verdicts || post.verdicts.length !== 6) {
       errors.push(`Missing verdicts: expected 6, got ${post.verdicts?.length || 0}`);
     }
     
     if (!post.executiveSummary?.keyInsights || post.executiveSummary.keyInsights.length < 3) {
       errors.push('Missing key insights (need 3-5)');
     }
     
     // ... more validation
     
     return errors;
   }
   ```

### Phase 3: Update TypeScript Models (15 min)
**File:** `src/app/core/models/index.ts`

1. Add new interfaces (already designed above)
2. Update `AnalysisPost` to include `verdicts`, `executiveSummary`, `marketContext`

### Phase 4: Test & Deploy (30 min)

1. Trigger a fresh analysis: `BTC`
2. Verify Firestore document structure
3. Check UI displays all data correctly
4. Deploy to production

---

## ✅ Success Criteria

- [ ] ALL verdict timeframes populated (ZERO "UNKNOWN")
- [ ] Confidence values are numbers (0-100)
- [ ] Key insights extracted and displayed
- [ ] Analysis reads like WSJ-level professional content
- [ ] All tables render properly in UI
- [ ] Schema validated before Firestore write
- [ ] Code deployed to https://alpha-insights-84c51.web.app

---

**Next Steps:** Implement Phase 1 (agent prompts) first, then Phase 2 (publish script).
