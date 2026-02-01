# Alpha Insights - Rich HTML Reports Guide

## Overview

All analysis reports are now rendered as **rich HTML** using Angular's `[innerHTML]` binding. This provides professional formatting, better readability, and visual hierarchy.

## How It Works

1. **Backend/Functions**: Generate reports as HTML strings (not plain text)
2. **Frontend**: Renders HTML via `[innerHTML]` with pre-styled CSS classes
3. **Result**: Beautiful, professional-looking reports with zero extra coding

## HTML Template

See `REPORT_TEMPLATE.html` for a complete example with all available styling options.

## Available Styling

### Text Formatting

```html
<!-- Headings (auto-styled) -->
<h2>Section Title</h2>
<h3>Subsection Title</h3>

<!-- Lead paragraph (larger, bolder) -->
<p class="lead">Important opening statement...</p>

<!-- Regular paragraph -->
<p>Regular body text...</p>

<!-- Emphasis -->
<strong>Bold text</strong>
<em>Italic text</em>
```

### Lists

```html
<!-- Unordered list (bullets are colored primary) -->
<ul>
  <li>Point one</li>
  <li>Point two</li>
</ul>

<!-- Ordered list -->
<ol>
  <li>First step</li>
  <li>Second step</li>
</ol>
```

### Callout Boxes

```html
<!-- Information box (blue) -->
<div class="callout info">
  <p><strong>💡 Insight:</strong> Key information here</p>
</div>

<!-- Success box (green) -->
<div class="callout success">
  <p><strong>✅ Bullish:</strong> Positive signal</p>
</div>

<!-- Warning box (yellow) -->
<div class="callout warning">
  <p><strong>⚠️ Caution:</strong> Risk factor</p>
</div>

<!-- Danger box (red) -->
<div class="callout danger">
  <p><strong>🚨 Risk:</strong> Important warning</p>
</div>
```

### Tables

```html
<table>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
      <th>Column 3</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Data 1</td>
      <td>Data 2</td>
      <td>Data 3</td>
    </tr>
  </tbody>
</table>
```

### Key Metrics (Definition List)

```html
<dl>
  <dt>RSI (14)</dt>
  <dd class="positive">65 - Bullish momentum</dd>
  
  <dt>MACD</dt>
  <dd class="negative">Bearish crossover</dd>
  
  <dt>Volume</dt>
  <dd>Above average</dd>
</dl>
```

### Badges

```html
<span class="badge success">LONG</span>
<span class="badge warning">WAIT</span>
<span class="badge danger">SHORT</span>
<span class="badge info">NEUTRAL</span>
```

### Blockquotes

```html
<blockquote>
  <p>Key takeaway or expert opinion quote.</p>
</blockquote>
```

### Horizontal Dividers

```html
<hr>
```

## Example: Technical Analysis

```html
<p class="lead">
  <strong>AAPL</strong> shows strong bullish momentum with price above all major MAs.
</p>

<h2>📊 Technical Setup</h2>

<h3>Key Indicators</h3>
<dl>
  <dt>RSI (14)</dt>
  <dd class="positive">62.4 - Bullish, room to run</dd>
  
  <dt>MACD</dt>
  <dd class="positive">Bullish crossover confirmed</dd>
  
  <dt>Volume</dt>
  <dd class="positive">+35% above average</dd>
</dl>

<h3>Price Levels</h3>
<table>
  <thead>
    <tr>
      <th>Level</th>
      <th>Price</th>
      <th>Type</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Resistance</td>
      <td>$185</td>
      <td>Recent high</td>
    </tr>
    <tr>
      <td>Support</td>
      <td>$175</td>
      <td>20 EMA</td>
    </tr>
  </tbody>
</table>

<div class="callout success">
  <p><strong>🎯 Trade Setup:</strong> Entry at $178, target $185, stop $174 (3:1 R/R)</p>
</div>

<h2>⚖️ Verdict</h2>
<blockquote>
  <p>Strong <span class="badge success">LONG</span> setup with favorable risk/reward. Multiple timeframes align bullish.</p>
</blockquote>
```

## Implementation

### Firebase Functions (Report Generation)

When generating reports in your Firebase Functions:

```typescript
// OLD WAY (Plain Text) ❌
const report = `
Technical Analysis
Price is above moving averages.
RSI is bullish.
`;

// NEW WAY (Rich HTML) ✅
const report = `
<h2>📊 Technical Analysis</h2>
<p class="lead">Price shows strong momentum above all major moving averages.</p>

<h3>Indicators</h3>
<dl>
  <dt>RSI (14)</dt>
  <dd class="positive">65 - Bullish momentum</dd>
  
  <dt>MACD</dt>
  <dd class="positive">Bullish crossover</dd>
</dl>

<div class="callout success">
  <p><strong>🎯 Signal:</strong> Strong LONG setup identified</p>
</div>
`;

// Store to Firestore
await db.collection('ResearchReports').doc(reportId).set({
  content: {
    technicalAnalysis: report,
    // ... other sections
  }
});
```

### Security Note

Angular's DomSanitizer is used to safely render HTML. Only use trusted HTML sources (your own backend/Functions). **Never allow user-generated HTML** without proper sanitization.

## Styling Customization

All styles are in `src/app/features/analysis-detail/analysis-detail.page.scss` under the `.markdown-content` class.

To add custom styles:

```scss
.markdown-content {
  // Add your custom classes here
  .custom-highlight {
    background: yellow;
    padding: 2px 4px;
  }
}
```

## Emojis

Use emojis liberally for visual interest:
- 📊 Charts/Data
- 📈 Bullish/Up
- 📉 Bearish/Down
- 💡 Insight
- ⚠️ Warning
- ✅ Success
- 🎯 Target
- 🚨 Alert
- 💰 Money/Profit
- 🔧 Tools/Technical

## Best Practices

1. **Start with a lead paragraph** - Summarize the key takeaway
2. **Use headings liberally** - Break content into scannable sections
3. **Callout boxes for key points** - Draw attention to important info
4. **Tables for structured data** - Price levels, timeframes, metrics
5. **Definition lists for metrics** - RSI, MACD, volume, etc.
6. **Badges for signals** - LONG, SHORT, WAIT, etc.
7. **Blockquotes for verdicts** - Final recommendation or summary
8. **Emojis for visual hierarchy** - Makes reports more engaging

## Migration Checklist

To migrate from plain text to HTML reports:

- [ ] Update report generation functions to output HTML
- [ ] Use `REPORT_TEMPLATE.html` as reference
- [ ] Test with DomSanitizer in Angular
- [ ] Ensure no XSS vulnerabilities (only trust your backend)
- [ ] Update existing reports in database (optional)

## Example Output

See the live demo at: https://alpha-insights-84c51.web.app

Navigate to any analysis detail page to see the rich HTML rendering in action.
