#!/usr/bin/env ts-node

/**
 * Publish Research to Firestore with Request ID Support
 * 
 * Usage:
 *   ts-node publish-to-firestore.ts <REQUEST_ID> <TICKER>
 *   ts-node publish-to-firestore.ts QdM1LrU3KQPuYFC2smds NVDA
 */

import * as fs from 'fs';
import * as path from 'path';

// Firebase imports
let admin: any;
let db: any;

try {
  admin = require('firebase-admin');
  
  // Initialize Firebase Admin if not already initialized
  if (!admin.apps || admin.apps.length === 0) {
    const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 
                               path.join(__dirname, '..', 'firebase-credentials.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      db = admin.firestore();
      console.log('✅ Firebase initialized');
    } else {
      console.warn('⚠️  No Firebase credentials found. Running in preview mode.');
    }
  } else {
    db = admin.firestore();
  }
} catch (e) {
  console.warn('⚠️  firebase-admin not installed or not configured. Running in preview mode.');
}

// ============================================================================
// TYPES
// ============================================================================

interface ResearchDocument {
  // Card display fields
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  
  // Core metadata
  ticker: string;
  assetType: 'stock' | 'crypto' | 'commodity';
  requestId: string;
  timestamp: Date;
  
  // Full article content (markdown)
  article: string;
  
  // Content object for UI (separate sections)
  content: {
    detailedAnalysis: string;
    technicalAnalysis: string;
    newsSummary: string;
    priceAnalysis: string;
    verdicts: string;
  };
  
  // Verdicts data
  verdicts: TimeframeVerdict[];
  
  // Trading recommendation
  recommendation: 'LONG' | 'SHORT' | 'HOLD';
  confidenceLevel: number; // 1-10
  
  // Price targets
  currentPrice: number;
  entry: number;
  stop: number;
  target: number;
  riskRewardRatio: number;
  
  // Engagement
  views: number;
  bookmarks: number;
  
  // Search
  searchTerms: string[];
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

interface TimeframeVerdict {
  timeframe: string;
  verdict: 'BUY' | 'HOLD' | 'SELL';
  confidence: 'High' | 'Medium' | 'Low';
  reasoning: string;
}

// ============================================================================
// PARSING FUNCTIONS
// ============================================================================

function parseVerdicts(verdictsContent: string): TimeframeVerdict[] {
  const verdicts: TimeframeVerdict[] = [];
  
  // Split by ### headers
  const sections = verdictsContent.split('###').filter(s => s.trim());
  
  for (const section of sections) {
    const lines = section.trim().split('\n').map(l => l.trim());
    
    // Extract timeframe (first line)
    const timeframe = lines[0].replace(/\*/g, '').trim();
    if (!timeframe || timeframe.includes('Multi-Timeframe') || timeframe.includes('Verdict')) continue;
    
    let verdict: 'BUY' | 'HOLD' | 'SELL' = 'HOLD';
    let confidence: 'High' | 'Medium' | 'Low' = 'Medium';
    let reasoning = '';
    
    for (const line of lines) {
      if (line.startsWith('**Verdict:**')) {
        const verdictText = line.replace('**Verdict:**', '').trim();
        if (verdictText.includes('BUY') || verdictText.includes('🟢')) verdict = 'BUY';
        else if (verdictText.includes('SELL') || verdictText.includes('🔴')) verdict = 'SELL';
        else if (verdictText.includes('HOLD') || verdictText.includes('🟡')) verdict = 'HOLD';
      } else if (line.startsWith('**Confidence:**')) {
        const confText = line.replace('**Confidence:**', '').trim();
        if (confText.includes('High')) confidence = 'High';
        else if (confText.includes('Low')) confidence = 'Low';
        else confidence = 'Medium';
      } else if (line.startsWith('**Reasoning:**')) {
        reasoning = line.replace('**Reasoning:**', '').trim();
      }
    }
    
    if (timeframe && reasoning) {
      verdicts.push({ timeframe, verdict, confidence, reasoning });
    }
  }
  
  return verdicts;
}

function extractCurrentPrice(reportContent: string): number {
  const match = reportContent.match(/Current Price[:\s*]+\$?([\d.]+)/i);
  return match ? parseFloat(match[1]) : 0;
}

function extractPriceTargets(technicalContent: string, reportContent: string): {
  entry: number;
  stop: number;
  target: number;
} {
  // Try to find in technical analysis first
  let entry = 0, stop = 0, target = 0;
  
  const entryMatch = technicalContent.match(/Entry[:\s*]+\$?([\d.]+)/i);
  const stopMatch = technicalContent.match(/Stop[:\s*]+\$?([\d.]+)/i);
  const targetMatch = technicalContent.match(/Target[:\s*]+\$?([\d.]+)/i);
  
  entry = entryMatch ? parseFloat(entryMatch[1]) : 0;
  stop = stopMatch ? parseFloat(stopMatch[1]) : 0;
  target = targetMatch ? parseFloat(targetMatch[1]) : 0;
  
  // Fallback to report if not found
  if (!entry) {
    const reportEntryMatch = reportContent.match(/Entry[:\s*]+\$?([\d.]+)/i);
    entry = reportEntryMatch ? parseFloat(reportEntryMatch[1]) : extractCurrentPrice(reportContent);
  }
  
  return { entry, stop, target };
}

function calculateRiskReward(entry: number, stop: number, target: number): number {
  if (!entry || !stop || !target) return 0;
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  return risk > 0 ? reward / risk : 0;
}

function determineRecommendation(verdicts: TimeframeVerdict[]): 'LONG' | 'SHORT' | 'HOLD' {
  // Look for 1 Week verdict
  const weekVerdict = verdicts.find(v => 
    v.timeframe.toLowerCase().includes('week') || 
    v.timeframe.toLowerCase().includes('1 week')
  );
  
  if (weekVerdict) {
    if (weekVerdict.verdict === 'BUY') return 'LONG';
    if (weekVerdict.verdict === 'SELL') return 'SHORT';
  }
  
  return 'HOLD';
}

function calculateConfidenceLevel(verdicts: TimeframeVerdict[]): number {
  const weekVerdict = verdicts.find(v => 
    v.timeframe.toLowerCase().includes('week') || 
    v.timeframe.toLowerCase().includes('1 week')
  );
  
  if (weekVerdict) {
    if (weekVerdict.confidence === 'High') return 8;
    if (weekVerdict.confidence === 'Medium') return 6;
    if (weekVerdict.confidence === 'Low') return 4;
  }
  
  return 7;
}

function generateTitle(ticker: string): string {
  const date = new Date().toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
  return `${ticker} Deep Dive - ${date}`;
}

function generateDescription(reportContent: string, verdicts: TimeframeVerdict[]): string {
  // Extract first meaningful paragraph from report
  const paragraphs = reportContent.split('\n\n').filter(p => 
    p.length > 100 && 
    !p.startsWith('#') && 
    !p.startsWith('**Generated:') &&
    !p.startsWith('---')
  );
  
  const firstPara = paragraphs[0] || '';
  
  // Truncate to ~200 chars for card description
  const truncated = firstPara.substring(0, 200).trim();
  const lastSpace = truncated.lastIndexOf(' ');
  
  return truncated.substring(0, lastSpace) + '...';
}

function combineArticle(
  reportContent: string, 
  verdictsContent: string,
  technicalContent: string,
  newsContent: string,
  priceContent: string,
  worldEventsContent: string
): string {
  // Build a comprehensive article in proper reading order
  return `
${reportContent}

---

## 🎯 Multi-Timeframe Verdicts

${verdictsContent}

---

## 📊 Detailed Technical Analysis

${technicalContent}

---

## 📰 News & Market Sentiment

${newsContent}

---

## 💰 Price Action Deep Dive

${priceContent}

---

## 🌍 Global & Macro Context

${worldEventsContent}

---

*Research compiled by Alpha Insights AI Research Team*
`.trim();
}

function getStockImageUrl(ticker: string): string {
  // Use a reliable stock chart service or placeholder
  // TradingView chart widget URL (public)
  return `https://s3.tradingview.com/snapshots/${ticker.toLowerCase()}/latest.png`;
}

function generateSearchTerms(ticker: string, title: string, description: string): string[] {
  const terms = new Set<string>();
  
  // Add ticker variations
  terms.add(ticker.toUpperCase());
  terms.add(ticker.toLowerCase());
  
  // Extract meaningful words from title and description
  const text = `${title} ${description}`.toLowerCase();
  const words = text.split(/\s+/).filter(w => w.length > 3);
  
  words.forEach(w => terms.add(w));
  
  return Array.from(terms);
}

// ============================================================================
// MAIN PUBLISH FUNCTION
// ============================================================================

async function publishToFirestore(requestId: string, ticker: string, assetType: 'stock' | 'crypto' | 'commodity' = 'stock') {
  const RESEARCH_DIR = path.join(__dirname, '..', 'research-output');
  
  console.log(`\n🔍 Publishing ${ticker} research (${assetType}) (Request: ${requestId})`);
  console.log('=' .repeat(80));
  
  // Read all research files
  const files: Record<string, string> = {};
  const fileMap = {
    report: `${requestId}-${ticker}-report.md`,
    verdicts: `${requestId}-${ticker}-verdicts.md`,
    technical: `${requestId}-${ticker}-technical-analysis.md`,
    news: `${requestId}-${ticker}-news-analysis.md`,
    price: `${requestId}-${ticker}-price-analysis.md`,
    worldEvents: `${requestId}-${ticker}-world-events.md`
  };
  
  console.log('\n📂 Reading research files...');
  for (const [key, filename] of Object.entries(fileMap)) {
    const filePath = path.join(RESEARCH_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`   ⚠️  Missing: ${filename}`);
      files[key] = '';
      continue;
    }
    files[key] = fs.readFileSync(filePath, 'utf-8');
    console.log(`   ✓ ${filename}`);
  }
  
  // Parse verdicts
  console.log('\n📊 Parsing verdicts...');
  const verdicts = parseVerdicts(files.verdicts);
  console.log(`   ✓ Found ${verdicts.length} timeframe verdicts`);
  verdicts.forEach(v => {
    console.log(`     - ${v.timeframe}: ${v.verdict} (${v.confidence})`);
  });
  
  // Extract metrics
  console.log('\n💰 Extracting price targets...');
  const currentPrice = extractCurrentPrice(files.report);
  const { entry, stop, target } = extractPriceTargets(files.technical, files.report);
  const riskRewardRatio = calculateRiskReward(entry, stop, target);
  
  console.log(`   Current: $${currentPrice}`);
  console.log(`   Entry: $${entry}`);
  console.log(`   Stop: $${stop}`);
  console.log(`   Target: $${target}`);
  console.log(`   R/R: 1:${riskRewardRatio.toFixed(2)}`);
  
  // Build document
  console.log('\n📝 Building Firestore document...');
  const now = new Date();
  const docId = `${ticker}-${now.getTime()}`;
  
  const title = generateTitle(ticker);
  const description = generateDescription(files.report, verdicts);
  const imageUrl = getStockImageUrl(ticker);
  const article = combineArticle(
    files.report,
    files.verdicts,
    files.technical,
    files.news,
    files.price,
    files.worldEvents
  );
  
  const recommendation = determineRecommendation(verdicts);
  const confidenceLevel = calculateConfidenceLevel(verdicts);
  
  const researchDoc: ResearchDocument = {
    id: docId,
    title,
    description,
    imageUrl,
    
    ticker: ticker.toUpperCase(),
    assetType: assetType,
    requestId,
    timestamp: now,
    
    article,
    
    // Content object for UI
    content: {
      detailedAnalysis: files.report,
      technicalAnalysis: files.technical,
      newsSummary: files.news,
      priceAnalysis: files.price,
      verdicts: files.verdicts
    },
    
    verdicts,
    
    recommendation,
    confidenceLevel,
    
    currentPrice,
    entry,
    stop,
    target,
    riskRewardRatio,
    
    views: 0,
    bookmarks: 0,
    
    searchTerms: generateSearchTerms(ticker, title, description),
    
    createdAt: now,
    updatedAt: now
  };
  
  console.log(`   ✓ Title: ${title}`);
  console.log(`   ✓ Description: ${description.substring(0, 100)}...`);
  console.log(`   ✓ Image: ${imageUrl}`);
  console.log(`   ✓ Article length: ${article.length} chars`);
  console.log(`   ✓ Recommendation: ${recommendation} (Confidence: ${confidenceLevel}/10)`);
  
  // Publish to Firestore or preview
  if (!db) {
    console.log('\n📋 PREVIEW MODE - No Firestore connection');
    console.log('=' .repeat(80));
    console.log(JSON.stringify(researchDoc, null, 2));
    console.log('=' .repeat(80));
    console.log('\n💡 To publish to Firestore:');
    console.log('   1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable');
    console.log('   2. Or place firebase-credentials.json in project root');
    console.log('   3. Run this script again\n');
    return researchDoc;
  }
  
  try {
    console.log('\n🚀 Publishing to Firestore...');
    
    const docRef = db.collection('research_reports').doc(docId);
    await docRef.set(researchDoc);
    
    console.log('   ✓ Published successfully!');
    console.log(`   📄 Document ID: ${docId}`);
    console.log(`   🔗 Collection: research_reports`);
    console.log(`   🌐 Request ID: ${requestId}`);
    
    console.log('\n✅ Research published to Firestore!\n');
    
    return researchDoc;
    
  } catch (error: any) {
    console.error('\n❌ Firestore publish failed:');
    console.error(error.message);
    throw error;
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const requestId = process.argv[2];
const ticker = process.argv[3];
const assetType = (process.argv[4] || 'stock') as 'stock' | 'crypto' | 'commodity';

if (!requestId || !ticker) {
  console.error('❌ Usage: ts-node publish-to-firestore.ts <REQUEST_ID> <TICKER> [ASSET_TYPE]');
  console.error('   Example: ts-node publish-to-firestore.ts QdM1LrU3KQPuYFC2smds NVDA stock');
  console.error('   Asset types: stock, crypto, commodity (default: stock)');
  process.exit(1);
}

publishToFirestore(requestId, ticker.toUpperCase(), assetType)
  .then(() => {
    console.log('✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
