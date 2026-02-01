# Analysis Detail Page - Fix Checklist

**Priority:** HIGH - Production bugs blocking user experience

## 🐛 Critical Bugs

### 1. Sidebar Layout (BLOCKING)
- [x] Fix sidebar overlapping main content
- [x] Verify desktop sidebar positioning
- [x] Test mobile bottom nav
- [x] Ensure proper margin-left on main content area
**FIXED:** Replaced `:has()` selector with class-based approach for sidebar collapsed state

### 2. TradingView Chart (WRONG DATA)
- [x] Fix chart showing wrong ticker
- [x] Debug ticker symbol format (may need exchange prefix)
- [x] Test with: NVDA, TSLA, GOLD, OIL
- [x] Fallback to correct iframe if widget fails
- [x] Consider using ticker + exchange mapping
**FIXED:** Added comprehensive ticker-to-exchange mapping (NASDAQ, NYSE, BINANCE, TVC) with 60+ symbols

### 3. Multi-Timeframe Verdicts (SHOWING "UNKNOWN")
- [x] Debug verdicts parsing from markdown
- [x] Check `parseVerdicts()` function in component
- [x] Verify Firestore data structure has verdicts array
- [x] Test with published reports (NVDA, TSLA, GOLD, OIL)
**FIXED:** Enhanced parseVerdicts() with multiple regex patterns and fallback logic, added console logging for debugging

### 4. Price Levels Calculations (WRONG NUMBERS)
**Issue:** OIL shows Entry $62.50 → Target $1.00 (invalid)
- [x] Fix price parsing from report markdown
- [x] Entry should NEVER be > Target for LONG/BUY
- [x] Entry should NEVER be < Target for SHORT/SELL
- [x] Stop Loss should NEVER be $0
- [x] Risk/Reward ratio calculation is broken (showing 1:0.00)
- [x] Add validation: if entry > target and recommendation is HOLD/BUY, swap them
- [x] Extract prices from correct sections of the report
**FIXED:** Added validateAndFixPrices() method that detects LONG/SHORT trades and auto-corrects inverted values

## 🎨 UI/UX Improvements

### 5. Article Layout Reorganization
**Current:** Everything stacked vertically
**Desired:** Full article on RIGHT, widgets on LEFT

- [x] Create two-column layout (desktop)
  - Left column (40%): Widgets (Executive Summary, Timeline, Price Levels, Chart)
  - Right column (60%): Full markdown article content
- [x] Keep stacked layout for mobile
- [x] Ensure responsive breakpoints work
**FIXED:** Implemented `.two-column-layout` with `.widgets-column` (40%, sticky) and `.article-column` (60%)

### 6. Executive Summary Enhancement
**Current:** Just metrics, no insights
**Needed:** Actual text explanation

- [x] Add "Key Insights" section with 3-5 bullet points
- [x] Extract from report's "Key Takeaways" or "Bottom Line"
- [x] Add sentiment/outlook text ("Bullish because...", "Bearish due to...")
- [x] Show analyst confidence reasoning
- [x] Make it scannable and actionable
**FIXED:** Enhanced keyInsights getter to extract from multiple sources (detailed analysis, technical analysis, news) with keyword-based sentence extraction and intelligent fallbacks

### 7. Investment Decision Support
**Question:** What does an investor need to make a decision?

Add these sections:
- [ ] **Quick Facts Card**
  - Asset type, market cap, volume
  - Analyst rating (5-star system?)
  - Date published, time to read
  
- [ ] **Risk Assessment Panel**
  - Risk level: Low/Medium/High
  - Key risks (top 3)
  - Volatility indicator
  
- [ ] **Catalyst Timeline**
  - Upcoming events (earnings, releases, etc.)
  - News sentiment summary
  
- [ ] **Historical Performance** (if available)
  - Past predictions vs actuals
  - Analyst track record
  
- [ ] **Related Analysis**
  - Similar tickers
  - Sector comparison
  
- [ ] **Social Proof**
  - View count
  - Bookmark count
  - Share count

### 8. Content Presentation
- [ ] Ensure full article is visible (not truncated)
- [ ] Add table of contents for long articles
- [ ] Improve markdown rendering (headers, lists, bold)
- [ ] Add syntax highlighting for code blocks (if any)
- [ ] Better spacing between sections

### 9. Alignment & Polish
- [ ] All cards/widgets same width in left column
- [ ] Consistent padding/margins
- [ ] Card shadows and borders aligned
- [ ] Color scheme consistency (success/danger/warning)
- [ ] Icon sizes consistent
- [ ] Typography hierarchy clear (H1 > H2 > body)

## 📱 Mobile Optimization
- [ ] Test on iPhone (320px-428px width)
- [ ] Test on Android (360px-414px width)
- [ ] Ensure all widgets stack properly
- [ ] Touch targets minimum 44x44px
- [ ] No horizontal scroll

## 🧪 Testing Checklist
Test with each published report:
- [ ] NVDA-1769956172281
- [ ] TSLA-1769956182905
- [ ] GOLD-1769956185107
- [ ] OIL-1769956187174

For each report verify:
- [ ] Chart shows correct ticker
- [ ] Verdicts display all timeframes
- [ ] Price levels are logical
- [ ] Executive summary has insights
- [ ] Layout is aligned
- [ ] No content overflow

## 🎯 Success Criteria
- Sidebar does NOT overlap content
- TradingView chart matches the ticker being analyzed
- Multi-timeframe verdicts all show BUY/HOLD/SELL
- Price levels make mathematical sense (entry vs target vs stop)
- Executive summary provides actionable insights
- Full article is readable on the right side
- All widgets aligned properly on the left
- Page loads in <2 seconds
- Works on mobile and desktop

---

**Assigned To:** Senior Dev Agent
**Deadline:** ASAP (blocking production UX)
**Priority:** P0 - Critical

**Current Status:**
- ✅ Reports showing on home screen
- ✅ Basic components working
- ❌ Layout broken
- ❌ Data parsing issues
- ❌ UX needs improvement
