/**
 * BACKEND EXAMPLE: Generating HTML Reports
 * 
 * This shows how to update your Firebase Functions (or backend API)
 * to generate rich HTML reports instead of plain text.
 */

// ============================================================================
// EXAMPLE 1: Technical Analysis Report Generator
// ============================================================================

interface TechnicalData {
  ticker: string;
  currentPrice: number;
  rsi: number;
  macd: string;
  volume: string;
  trend: 'LONG' | 'SHORT' | 'NEUTRAL';
  confidence: number;
  levels: {
    resistance: number;
    support: number;
  };
}

function generateTechnicalAnalysisHTML(data: TechnicalData): string {
  const { ticker, currentPrice, rsi, macd, volume, trend, confidence, levels } = data;
  
  // Determine RSI sentiment
  const rsiSentiment = rsi > 70 ? 'negative' : rsi > 50 ? 'positive' : '';
  const rsiText = rsi > 70 
    ? 'Overbought - potential reversal' 
    : rsi > 50 
    ? 'Bullish momentum' 
    : 'Weak momentum';
  
  // Build HTML
  return `
<p class="lead">
  <strong>${ticker}</strong> is currently trading at $${currentPrice}, showing <strong>${trend.toLowerCase()}</strong> 
  momentum across multiple technical indicators.
</p>

<h2>📊 Technical Indicators</h2>

<dl>
  <dt>RSI (14)</dt>
  <dd class="${rsiSentiment}">${rsi} - ${rsiText}</dd>
  
  <dt>MACD</dt>
  <dd class="${macd.includes('Bullish') ? 'positive' : macd.includes('Bearish') ? 'negative' : ''}">
    ${macd}
  </dd>
  
  <dt>Volume</dt>
  <dd class="${volume.includes('Above') ? 'positive' : ''}">${volume}</dd>
</dl>

<h3>Key Price Levels</h3>
<table>
  <thead>
    <tr>
      <th>Level</th>
      <th>Price</th>
      <th>Distance</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Resistance</td>
      <td>$${levels.resistance}</td>
      <td>${((levels.resistance - currentPrice) / currentPrice * 100).toFixed(1)}%</td>
    </tr>
    <tr>
      <td>Current Price</td>
      <td>$${currentPrice}</td>
      <td>-</td>
    </tr>
    <tr>
      <td>Support</td>
      <td>$${levels.support}</td>
      <td>${((currentPrice - levels.support) / currentPrice * 100).toFixed(1)}%</td>
    </tr>
  </tbody>
</table>

<h2>⚖️ Trading Verdict</h2>

${trend === 'LONG' 
  ? `<div class="callout success">
      <p><strong>🎯 Bullish Setup Identified:</strong> Multiple indicators confirm ${trend} bias. 
      Entry near support at $${levels.support} offers favorable risk/reward.</p>
    </div>`
  : trend === 'SHORT'
  ? `<div class="callout danger">
      <p><strong>⚠️ Bearish Setup:</strong> Technical indicators suggest ${trend} pressure. 
      Consider waiting for confirmation before entry.</p>
    </div>`
  : `<div class="callout warning">
      <p><strong>⏸️ Neutral Zone:</strong> No clear directional bias. Wait for confirmation signal.</p>
    </div>`
}

<blockquote>
  <p>Confidence Level: <strong>${confidence}/10</strong> - ${
    confidence >= 8 ? 'High conviction setup' :
    confidence >= 6 ? 'Moderate confidence' :
    'Lower conviction, proceed with caution'
  }</p>
</blockquote>
  `.trim();
}

// ============================================================================
// EXAMPLE 2: News Summary Report Generator
// ============================================================================

interface NewsItem {
  headline: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  date: string;
}

interface NewsSummary {
  ticker: string;
  overallSentiment: 'bullish' | 'bearish' | 'neutral';
  recentNews: NewsItem[];
  keyInsights: string[];
}

function generateNewsSummaryHTML(data: NewsSummary): string {
  const { ticker, overallSentiment, recentNews, keyInsights } = data;
  
  // Separate news by sentiment
  const positiveNews = recentNews.filter(n => n.sentiment === 'positive');
  const negativeNews = recentNews.filter(n => n.sentiment === 'negative');
  
  return `
<p class="lead">
  Recent news flow for <strong>${ticker}</strong> shows ${overallSentiment} sentiment 
  with ${recentNews.length} significant developments in the past week.
</p>

<h2>📰 Recent Headlines</h2>

${positiveNews.length > 0 ? `
<h3>🟢 Positive Catalysts</h3>
<ul>
  ${positiveNews.map(news => `
    <li>
      <strong>${news.headline}</strong> 
      ${news.impact === 'high' ? '<span class="badge success">High Impact</span>' : ''}
      <br><small>${news.date}</small>
    </li>
  `).join('')}
</ul>
` : ''}

${negativeNews.length > 0 ? `
<h3>🔴 Headwinds</h3>
<ul>
  ${negativeNews.map(news => `
    <li>
      <strong>${news.headline}</strong>
      ${news.impact === 'high' ? '<span class="badge danger">High Impact</span>' : ''}
      <br><small>${news.date}</small>
    </li>
  `).join('')}
</ul>
` : ''}

<h2>💭 Key Insights</h2>
<ul>
  ${keyInsights.map(insight => `<li>${insight}</li>`).join('')}
</ul>

${overallSentiment === 'bullish' 
  ? `<div class="callout success">
      <p><strong>📈 Bullish Sentiment:</strong> Positive news flow supports upward price momentum. 
      Fundamental catalysts align with technical setup.</p>
    </div>`
  : overallSentiment === 'bearish'
  ? `<div class="callout danger">
      <p><strong>📉 Bearish Sentiment:</strong> Negative headlines creating selling pressure. 
      Exercise caution until sentiment improves.</p>
    </div>`
  : `<div class="callout warning">
      <p><strong>⚖️ Mixed Sentiment:</strong> Conflicting signals in news flow. 
      Wait for clearer directional bias.</p>
    </div>`
}
  `.trim();
}

// ============================================================================
// EXAMPLE 3: Complete Report Assembly
// ============================================================================

async function createAnalysisReport(ticker: string) {
  // 1. Gather data (from your data sources)
  const technicalData: TechnicalData = {
    ticker,
    currentPrice: 535,
    rsi: 62.4,
    macd: 'Bullish crossover confirmed',
    volume: 'Above average (+35%)',
    trend: 'LONG',
    confidence: 8,
    levels: {
      resistance: 580,
      support: 520
    }
  };
  
  const newsData: NewsSummary = {
    ticker,
    overallSentiment: 'bullish',
    recentNews: [
      {
        headline: 'Q4 Earnings Beat Expectations by 12%',
        sentiment: 'positive',
        impact: 'high',
        date: '2024-01-15'
      },
      {
        headline: 'Major Partnership Announced',
        sentiment: 'positive',
        impact: 'high',
        date: '2024-01-14'
      }
    ],
    keyInsights: [
      'Strong earnings momentum continues',
      'Analyst upgrades driving institutional interest',
      'Sector rotation favoring tech leaders'
    ]
  };
  
  // 2. Generate HTML for each section
  const technicalHTML = generateTechnicalAnalysisHTML(technicalData);
  const newsHTML = generateNewsSummaryHTML(newsData);
  
  // 3. Create detailed analysis (you can use AI/LLM here)
  const detailedAnalysis = `
<p class="lead">
  <strong>${ticker}</strong> presents a compelling <span class="badge success">LONG</span> opportunity 
  with strong technical and fundamental alignment.
</p>

<h2>📊 Overview</h2>
<p>
  The stock has formed a bullish continuation pattern above all major moving averages, 
  while positive earnings and news catalysts support upward momentum. This creates a 
  favorable risk/reward setup for swing traders.
</p>

<h3>Trade Setup</h3>
<ul>
  <li><strong>Entry Zone:</strong> $530-535 (current price area)</li>
  <li><strong>Stop Loss:</strong> $510 (below key support)</li>
  <li><strong>Target 1:</strong> $560 (50% position)</li>
  <li><strong>Target 2:</strong> $580 (remaining 50%)</li>
  <li><strong>Risk/Reward:</strong> 3.2:1 to first target</li>
</ul>

<div class="callout info">
  <p><strong>💡 Strategy:</strong> Consider scaling into position with 50% at current levels 
  and 50% on any pullback to $525 support zone.</p>
</div>

<h2>🎯 Price Targets</h2>
<table>
  <thead>
    <tr>
      <th>Target</th>
      <th>Price</th>
      <th>Gain</th>
      <th>Action</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Target 1</td>
      <td>$560</td>
      <td>+4.7%</td>
      <td>Take 50% profit</td>
    </tr>
    <tr>
      <td>Target 2</td>
      <td>$580</td>
      <td>+8.4%</td>
      <td>Take 50% profit</td>
    </tr>
    <tr>
      <td>Stretch</td>
      <td>$600</td>
      <td>+12.1%</td>
      <td>Trail stop</td>
    </tr>
  </tbody>
</table>

<hr>

<div class="callout danger">
  <p><strong>⚠️ Disclaimer:</strong> This analysis is for educational purposes only. 
  Always do your own research and consult a licensed financial advisor.</p>
</div>
  `.trim();
  
  // 4. Save to Firestore
  const reportData = {
    id: `${ticker}-${Date.now()}`,
    ticker,
    title: `${ticker} Technical Analysis & Trading Setup`,
    timestamp: new Date(),
    assetType: 'stock',
    recommendation: 'LONG',
    entry: 535,
    stop: 510,
    target: 580,
    riskRewardRatio: 3.2,
    confidenceLevel: 8,
    content: {
      detailedAnalysis: detailedAnalysis,
      technicalAnalysis: technicalHTML,
      newsSummary: newsHTML,
      priceAnalysis: '' // Optional
    },
    // ... other fields
  };
  
  // await db.collection('ResearchReports').add(reportData);
  console.log('Report created:', reportData);
  
  return reportData;
}

// ============================================================================
// USAGE IN FIREBASE FUNCTIONS
// ============================================================================

/*
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

export const generateDailyReport = functions.pubsub
  .schedule('0 16 * * *') // 4 PM daily
  .onRun(async (context) => {
    const tickers = ['AAPL', 'NVDA', 'TSLA', 'MSFT'];
    
    for (const ticker of tickers) {
      const report = await createAnalysisReport(ticker);
      
      await admin.firestore()
        .collection('ResearchReports')
        .add(report);
      
      console.log(`Generated report for ${ticker}`);
    }
    
    return null;
  });
*/

// ============================================================================
// HELPER: Escape HTML (if using user input - NOT NEEDED for your own content)
// ============================================================================

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ============================================================================
// TESTING
// ============================================================================

// Uncomment to test locally:
// createAnalysisReport('NVDA').then(() => console.log('Done'));
