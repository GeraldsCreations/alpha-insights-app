#!/usr/bin/env node

/**
 * Research Orchestrator
 * 
 * Monitors research_triggers collection and processes pending requests
 * by generating analysis reports and updating the database.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

console.log('🚀 Research Orchestrator Starting...\n');

// Store active processing to prevent duplicates
const processing = new Set();

/**
 * Process a single research trigger
 */
async function processTrigger(triggerId, triggerData) {
  if (processing.has(triggerId)) {
    console.log(`⏭️  Already processing ${triggerId}, skipping`);
    return;
  }
  
  processing.add(triggerId);
  
  const { ticker, assetType, userId, requestId } = triggerData;
  
  console.log(`\n📊 Processing Research Request`);
  console.log(`   Trigger ID: ${triggerId}`);
  console.log(`   Ticker: ${ticker}`);
  console.log(`   Asset Type: ${assetType}`);
  console.log(`   User: ${userId}`);
  
  try {
    // Update trigger status to processing
    await db.collection('research_triggers').doc(triggerId).update({
      status: 'processing',
      processingStartedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    // Generate the analysis report
    console.log(`   🔬 Generating analysis for ${ticker}...`);
    const report = await generateAnalysisReport(ticker, assetType);
    
    // Save report to research_reports collection
    console.log(`   💾 Saving report to database...`);
    const reportRef = await db.collection('research_reports').add(report);
    const reportId = reportRef.id;
    
    console.log(`   ✅ Report created: ${reportId}`);
    
    // Update the custom report request
    if (requestId) {
      await db.collection('custom_report_requests').doc(requestId).update({
        status: 'complete',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        reportId: reportId
      });
      console.log(`   ✅ Updated custom request: ${requestId}`);
    }
    
    // Update trigger to complete
    await db.collection('research_triggers').doc(triggerId).update({
      status: 'complete',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      reportId: reportId
    });
    
    console.log(`   🎉 Research completed successfully!`);
    
  } catch (error) {
    console.error(`   ❌ Error processing trigger:`, error);
    
    // Update trigger to failed
    await db.collection('research_triggers').doc(triggerId).update({
      status: 'failed',
      failedAt: admin.firestore.FieldValue.serverTimestamp(),
      error: error.message
    });
    
    // Update custom request to failed
    if (requestId) {
      await db.collection('custom_report_requests').doc(requestId).update({
        status: 'failed',
        failedAt: admin.firestore.FieldValue.serverTimestamp(),
        error: error.message
      });
    }
  } finally {
    processing.delete(triggerId);
  }
}

/**
 * Call the existing TypeScript research pipeline
 */
async function runResearchPipeline(ticker, assetType, requestId) {
  console.log(`   🤖 Spawning research agents for ${ticker}...`);
  
  const { exec } = require('child_process');
  const util = require('util');
  const execAsync = util.promisify(exec);
  
  try {
    // Run the existing TypeScript research orchestrator
    const cmd = `cd /root/.openclaw/workspace/alpha-insights-app/scripts && npx ts-node research-orchestrator.ts ${ticker} ${assetType}`;
    
    const { stdout, stderr } = await execAsync(cmd, { 
      timeout: 300000, // 5 minute timeout
      maxBuffer: 10 * 1024 * 1024 // 10MB buffer
    });
    
    if (stderr && !stderr.includes('warning')) {
      console.log(`   ⚠️  Research stderr:`, stderr);
    }
    
    console.log(`   ✅ Research pipeline completed for ${ticker}`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Research pipeline failed:`, error.message);
    throw error;
  }
}

/**
 * Generate analysis report using real market data + AI agents
 */
async function generateAnalysisReport(ticker, assetType) {
  const marketDataAPI = require('./market-data-api');
  
  // Fetch real market data
  console.log(`   📊 Fetching real market data...`);
  const marketData = await marketDataAPI.getMarketData(ticker, assetType);
  
  if (!marketData) {
    throw new Error('Failed to fetch market data');
  }
  
  // Calculate technical indicators
  const indicators = marketDataAPI.calculateIndicators(marketData);
  
  console.log(`   📈 Price: $${marketData.currentPrice.toLocaleString()}`);
  console.log(`   📊 Change: ${marketData.priceChangePercent?.toFixed(2)}%`);
  console.log(`   🎯 RSI: ${indicators.rsi}`);
  console.log(`   📌 Trend: ${indicators.trend}`);
  
  const now = new Date();
  
  // Generate rich HTML report with real data
  const technicalAnalysis = generateTechnicalHTML(ticker, marketData, indicators);
  const newsSummary = generateNewsHTML(ticker, marketData);
  const detailedAnalysis = generateDetailedHTML(ticker, marketData, indicators);
  
  // Determine recommendation based on indicators
  const recommendation = indicators.trend.includes('LONG') ? 'LONG' : 
                        indicators.trend.includes('SHORT') ? 'SHORT' : 
                        'NO_TRADE';
  
  // Calculate price targets
  const currentPrice = marketData.currentPrice;
  const entry = currentPrice;
  const stop = recommendation === 'LONG' 
    ? currentPrice * 0.95  // 5% stop loss for long
    : currentPrice * 1.05; // 5% stop loss for short
  const target = recommendation === 'LONG'
    ? currentPrice * 1.10  // 10% target for long
    : currentPrice * 0.90; // 10% target for short
  const rr = Math.abs((target - entry) / (entry - stop));
  
  return {
    id: `${ticker}-${Date.now()}`,
    ticker,
    title: `${marketData.name} (${ticker}) Analysis - ${now.toLocaleDateString()}`,
    heroImage: `https://via.placeholder.com/800x400?text=${ticker}+${recommendation}`,
    description: `Comprehensive ${assetType} analysis for ${ticker} with ${recommendation} recommendation`,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    assetType: assetType || 'crypto',
    
    // Analysis content (HTML)
    content: {
      detailedAnalysis: detailedAnalysis,
      technicalAnalysis: technicalAnalysis,
      newsSummary: newsSummary,
      priceAnalysis: ''
    },
    
    // Trading recommendation (real data)
    recommendation: recommendation,
    entry: Math.round(entry),
    stop: Math.round(stop),
    target: Math.round(target),
    riskRewardRatio: parseFloat(rr.toFixed(2)),
    confidenceLevel: indicators.confidence,
    
    // Metadata
    authorId: 'system',
    views: 0,
    bookmarks: 0,
    searchTerms: [ticker.toLowerCase(), marketData.name.toLowerCase(), assetType],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
}

/**
 * Generate technical analysis HTML with real data
 */
function generateTechnicalHTML(ticker, marketData, indicators) {
  const rsiClass = indicators.rsi > 70 ? 'negative' : indicators.rsi > 50 ? 'positive' : '';
  const rsiText = indicators.rsi > 70 ? 'Overbought' : indicators.rsi > 50 ? 'Bullish momentum' : 'Weak momentum';
  
  const priceChange = marketData.priceChangePercent || 0;
  const changeClass = priceChange > 0 ? 'positive' : 'negative';
  
  return `
<p class="lead">
  <strong>${ticker}</strong> (${marketData.name}) is trading at $${marketData.currentPrice.toLocaleString()} 
  with <strong>${indicators.trend.replace('_', ' ')}</strong> technical setup.
</p>

<h2>📊 Technical Setup</h2>

<h3>Current Price Action</h3>
<dl>
  <dt>Current Price</dt>
  <dd class="${changeClass}">$${marketData.currentPrice.toLocaleString()} (${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}%)</dd>
  
  <dt>24H Range</dt>
  <dd>$${marketData.low?.toLocaleString()} - $${marketData.high?.toLocaleString()}</dd>
  
  <dt>52-Week Range</dt>
  <dd>$${marketData.fiftyTwoWeekLow?.toLocaleString()} - $${marketData.fiftyTwoWeekHigh?.toLocaleString()}</dd>
</dl>

<h3>Key Indicators</h3>
<dl>
  <dt>RSI (14)</dt>
  <dd class="${rsiClass}">${indicators.rsi} - ${rsiText}</dd>
  
  <dt>MACD</dt>
  <dd class="${changeClass}">${indicators.macdSignal}</dd>
  
  <dt>Volume</dt>
  <dd class="positive">${indicators.volumeSignal}</dd>
  
  <dt>Price Position</dt>
  <dd>${indicators.pricePosition}% of 52-week range</dd>
</dl>

<h3>Price Levels</h3>
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
      <td>52W High</td>
      <td>$${marketData.fiftyTwoWeekHigh?.toLocaleString()}</td>
      <td>${(((marketData.fiftyTwoWeekHigh - marketData.currentPrice) / marketData.currentPrice) * 100).toFixed(1)}%</td>
    </tr>
    <tr>
      <td>Current</td>
      <td>$${marketData.currentPrice.toLocaleString()}</td>
      <td>-</td>
    </tr>
    <tr>
      <td>52W Low</td>
      <td>$${marketData.fiftyTwoWeekLow?.toLocaleString()}</td>
      <td>${(((marketData.currentPrice - marketData.fiftyTwoWeekLow) / marketData.currentPrice) * 100).toFixed(1)}%</td>
    </tr>
  </tbody>
</table>

<div class="callout ${indicators.trend.includes('LONG') ? 'success' : indicators.trend.includes('SHORT') ? 'danger' : 'warning'}">
  <p><strong>🎯 ${indicators.trend} Setup Detected</strong> - Confidence: ${indicators.confidence}/10</p>
</div>
  `.trim();
}

/**
 * Generate news summary HTML with real market data
 */
function generateNewsHTML(ticker, marketData) {
  const sentiment = marketData.sentiment || 50;
  const sentimentText = sentiment > 60 ? 'bullish' : sentiment < 40 ? 'bearish' : 'neutral';
  
  const priceChange = marketData.priceChangePercent || 0;
  const priceChange7d = marketData.priceChange7d || 0;
  const priceChange30d = marketData.priceChange30d || 0;
  
  return `
<p class="lead">
  <strong>${ticker}</strong> (${marketData.name}) shows ${sentimentText} market sentiment 
  with ${Math.abs(priceChange).toFixed(2)}% ${priceChange > 0 ? 'gain' : 'loss'} in the last 24 hours.
</p>

<h2>📰 Market Overview</h2>

<h3>📊 Price Performance</h3>
<ul>
  <li><strong>24H:</strong> ${priceChange > 0 ? '+' : ''}${priceChange.toFixed(2)}% <span class="badge ${priceChange > 0 ? 'success' : 'danger'}">${priceChange > 0 ? 'Up' : 'Down'}</span></li>
  ${priceChange7d ? `<li><strong>7D:</strong> ${priceChange7d > 0 ? '+' : ''}${priceChange7d.toFixed(2)}%</li>` : ''}
  ${priceChange30d ? `<li><strong>30D:</strong> ${priceChange30d > 0 ? '+' : ''}${priceChange30d.toFixed(2)}%</li>` : ''}
  <li><strong>Market Cap:</strong> $${(marketData.marketCap / 1e9).toFixed(2)}B</li>
  <li><strong>24H Volume:</strong> $${(marketData.volume24h / 1e9).toFixed(2)}B</li>
</ul>

<h3>💭 Market Sentiment</h3>
<blockquote>
  <p>Community sentiment is <strong>${sentimentText}</strong> (${sentiment}% positive) with 
  ${priceChange > 0 ? 'positive' : 'negative'} price momentum supporting the trend.</p>
</blockquote>

${marketData.description ? `
<h3>📝 About ${ticker}</h3>
<p>${marketData.description}${marketData.description.length >= 500 ? '...' : ''}</p>
` : ''}
  `.trim();
}

/**
 * Generate detailed analysis HTML with real data
 */
function generateDetailedHTML(ticker, marketData, indicators) {
  const recommendation = indicators.trend.includes('LONG') ? 'LONG' : 
                        indicators.trend.includes('SHORT') ? 'SHORT' : 
                        'NO_TRADE';
  
  const entry = marketData.currentPrice;
  const stop = recommendation === 'LONG' ? entry * 0.95 : entry * 1.05;
  const target1 = recommendation === 'LONG' ? entry * 1.10 : entry * 0.90;
  const target2 = recommendation === 'LONG' ? entry * 1.15 : entry * 0.85;
  const rr = Math.abs((target1 - entry) / (entry - stop));
  
  return `
<p class="lead">
  <strong>${ticker}</strong> (${marketData.name}) presents a <span class="badge ${recommendation === 'LONG' ? 'success' : recommendation === 'SHORT' ? 'danger' : 'warning'}">${recommendation}</span> 
  opportunity with ${indicators.confidence}/10 confidence based on current market conditions.
</p>

<h2>📊 Analysis Summary</h2>
<p>
  Current price of $${marketData.currentPrice.toLocaleString()} is ${indicators.pricePosition}% of the 52-week range, 
  with ${indicators.trend.replace('_', ' ').toLowerCase()} momentum. RSI at ${indicators.rsi} suggests 
  ${indicators.rsi > 70 ? 'overbought conditions' : indicators.rsi > 50 ? 'bullish momentum continues' : 'weak momentum'}.
</p>

<h3>🎯 Trade Plan</h3>
<ul>
  <li><strong>Recommendation:</strong> <span class="badge ${recommendation === 'LONG' ? 'success' : recommendation === 'SHORT' ? 'danger' : 'warning'}">${recommendation}</span></li>
  <li><strong>Entry Price:</strong> $${entry.toLocaleString()}</li>
  <li><strong>Stop Loss:</strong> $${Math.round(stop).toLocaleString()} (${recommendation === 'LONG' ? '-5%' : '+5%'})</li>
  <li><strong>Target 1:</strong> $${Math.round(target1).toLocaleString()} (${recommendation === 'LONG' ? '+10%' : '-10%'})</li>
  <li><strong>Target 2:</strong> $${Math.round(target2).toLocaleString()} (${recommendation === 'LONG' ? '+15%' : '-15%'})</li>
  <li><strong>Risk/Reward:</strong> ${rr.toFixed(2)}:1 to first target</li>
  <li><strong>Confidence:</strong> ${indicators.confidence}/10</li>
</ul>

<div class="callout info">
  <p><strong>💡 Strategy:</strong> Consider scaling into position with 50% at current levels 
  and 50% on ${recommendation === 'LONG' ? 'pullbacks to support' : 'rallies to resistance'}. 
  Adjust position size based on your risk tolerance.</p>
</div>

<h3>⚖️ Risk Factors</h3>
<ul>
  <li>Market volatility may impact price action</li>
  <li>External events could trigger sudden moves</li>
  <li>Always use proper position sizing (1-2% of capital at risk)</li>
  <li>Set stop losses immediately after entry</li>
</ul>

<hr>

<div class="callout danger">
  <p><strong>⚠️ Disclaimer:</strong> This analysis is for educational purposes only and does not constitute financial advice. 
  Past performance does not guarantee future results. Always do your own research and consult a licensed financial advisor 
  before making investment decisions. Trade at your own risk.</p>
</div>
  `.trim();
}

/**
 * Monitor research_triggers collection for new pending requests
 */
function startMonitoring() {
  console.log('👀 Monitoring research_triggers for pending requests...\n');
  
  const unsubscribe = db.collection('research_triggers')
    .where('status', '==', 'pending')
    .onSnapshot(snapshot => {
      snapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          const triggerId = change.doc.id;
          const triggerData = change.doc.data();
          
          console.log(`🔔 New pending trigger detected: ${triggerId}`);
          
          // Process async (don't block the listener)
          processTrigger(triggerId, triggerData).catch(err => {
            console.error('Error in processTrigger:', err);
          });
        }
      });
    }, error => {
      console.error('❌ Snapshot error:', error);
    });
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down orchestrator...');
    unsubscribe();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n\n👋 Shutting down orchestrator...');
    unsubscribe();
    process.exit(0);
  });
}

// Start monitoring
startMonitoring();

// Keep alive
console.log('✅ Orchestrator is running. Press Ctrl+C to stop.\n');
