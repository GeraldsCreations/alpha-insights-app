#!/usr/bin/env ts-node

/**
 * Publish Research Analysis to Firestore
 * 
 * Reads markdown research output files and publishes them to the
 * Firestore AnalysisPosts collection.
 * 
 * Usage:
 *   npm run publish:research <TICKER>
 *   npm run publish:research AAPL
 */

import * as fs from 'fs';
import * as path from 'path';

// Firebase imports (these will fail gracefully if not configured)
let admin: any;
try {
  admin = require('firebase-admin');
} catch (e) {
  console.warn('⚠️  firebase-admin not installed. Running in preview mode.');
}

// ============================================================================
// TYPES (matching src/app/core/models/index.ts)
// ============================================================================

interface AnalysisPost {
  id: string;
  title: string;
  heroImage: string;
  description: string;
  timestamp: Date;
  assetType: 'crypto' | 'stock';
  ticker: string;
  content: AnalysisContent;
  recommendation: 'LONG' | 'SHORT' | 'NO_TRADE';
  entry: number;
  stop: number;
  target: number;
  riskRewardRatio: number;
  confidenceLevel: number;
  authorId: string;
  views: number;
  bookmarks: number;
  searchTerms: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface AnalysisContent {
  charts: string[];
  technicalAnalysis: string;
  newsSummary: string;
  detailedAnalysis: string;
}

interface VerdictData {
  timeframe: string;
  verdict: string;
  confidence: string;
  reasoning: string;
}

// ============================================================================
// FILE PARSING UTILITIES
// ============================================================================

/**
 * Parse verdicts from AAPL-verdicts.md file
 */
function parseVerdicts(content: string): VerdictData[] {
  const verdicts: VerdictData[] = [];
  const sections = content.split('###').filter(s => s.trim());
  
  for (const section of sections) {
    const lines = section.trim().split('\n');
    if (lines.length < 3) continue;
    
    const timeframe = lines[0].trim();
    let verdict = '';
    let confidence = '';
    let reasoning = '';
    
    for (const line of lines) {
      if (line.startsWith('**Verdict:**')) {
        verdict = line.replace('**Verdict:**', '').trim();
      } else if (line.startsWith('**Confidence:**')) {
        confidence = line.replace('**Confidence:**', '').trim();
      } else if (line.startsWith('**Reasoning:**')) {
        reasoning = line.replace('**Reasoning:**', '').trim();
      }
    }
    
    if (timeframe && verdict && confidence && reasoning) {
      verdicts.push({ timeframe, verdict, confidence, reasoning });
    }
  }
  
  return verdicts;
}

/**
 * Extract trading recommendation from verdicts
 */
function extractRecommendation(verdicts: VerdictData[]): 'LONG' | 'SHORT' | 'NO_TRADE' {
  // Look for the consensus or 1-week verdict
  const weekVerdict = verdicts.find(v => v.timeframe.includes('Week') || v.timeframe.includes('1 Week'));
  
  if (weekVerdict) {
    if (weekVerdict.verdict.includes('BUY') || weekVerdict.verdict.includes('🟢')) {
      return 'LONG';
    } else if (weekVerdict.verdict.includes('SELL') || weekVerdict.verdict.includes('🔴')) {
      return 'SHORT';
    }
  }
  
  return 'NO_TRADE';
}

/**
 * Extract confidence level from verdicts (1-10 scale)
 */
function extractConfidenceLevel(verdicts: VerdictData[]): number {
  const weekVerdict = verdicts.find(v => v.timeframe.includes('Week') || v.timeframe.includes('1 Week'));
  
  if (weekVerdict) {
    const confidence = weekVerdict.confidence.toLowerCase();
    if (confidence.includes('high')) return 8;
    if (confidence.includes('medium')) return 6;
    if (confidence.includes('low')) return 4;
  }
  
  return 7; // Default
}

/**
 * Extract price targets from technical analysis
 */
function extractPriceTargets(technicalContent: string): { entry: number; stop: number; target: number } {
  // Look for trade setup sections
  const setupMatch = technicalContent.match(/Entry[:\s]+\$?([\d.]+)/i);
  const stopMatch = technicalContent.match(/Stop[:\s]+\$?([\d.]+)/i);
  const targetMatch = technicalContent.match(/Target[:\s]+\$?([\d.]+)/i);
  
  return {
    entry: setupMatch ? parseFloat(setupMatch[1]) : 259.48,
    stop: stopMatch ? parseFloat(stopMatch[1]) : 250.00,
    target: targetMatch ? parseFloat(targetMatch[1]) : 295.00
  };
}

/**
 * Calculate risk/reward ratio
 */
function calculateRiskReward(entry: number, stop: number, target: number): number {
  const risk = Math.abs(entry - stop);
  const reward = Math.abs(target - entry);
  return reward / risk;
}

/**
 * Extract current price from report
 */
function extractCurrentPrice(reportContent: string): number {
  const match = reportContent.match(/Current Price[:\s]+\$?([\d.]+)/i);
  return match ? parseFloat(match[1]) : 0;
}

/**
 * Generate search terms from ticker and content
 */
function generateSearchTerms(ticker: string, title: string): string[] {
  const terms = [
    ticker.toUpperCase(),
    ticker.toLowerCase(),
    ...title.toLowerCase().split(' ').filter(w => w.length > 3)
  ];
  return Array.from(new Set(terms));
}

// ============================================================================
// MAIN PUBLISH FUNCTION
// ============================================================================

async function publishAnalysis(ticker: string) {
  const RESEARCH_DIR = path.join(__dirname, '..', 'research-output');
  const FILES = {
    report: `${ticker}-report.md`,
    verdicts: `${ticker}-verdicts.md`,
    technical: `${ticker}-technical-analysis.md`,
    news: `${ticker}-news-analysis.md`,
    price: `${ticker}-price-analysis.md`,
    worldEvents: `${ticker}-world-events.md`
  };
  
  console.log('\n🔍 Reading research files...');
  
  // Read all files
  const files: Record<string, string> = {};
  for (const [key, filename] of Object.entries(FILES)) {
    const filePath = path.join(RESEARCH_DIR, filename);
    if (!fs.existsSync(filePath)) {
      console.error(`❌ Missing file: ${filename}`);
      process.exit(1);
    }
    files[key] = fs.readFileSync(filePath, 'utf-8');
    console.log(`   ✓ ${filename}`);
  }
  
  console.log('\n📊 Parsing analysis data...');
  
  // Parse verdicts
  const verdicts = parseVerdicts(files.verdicts);
  console.log(`   ✓ Parsed ${verdicts.length} timeframe verdicts`);
  
  // Extract key metrics
  const recommendation = extractRecommendation(verdicts);
  const confidenceLevel = extractConfidenceLevel(verdicts);
  const { entry, stop, target } = extractPriceTargets(files.technical);
  const riskRewardRatio = calculateRiskReward(entry, stop, target);
  const currentPrice = extractCurrentPrice(files.report);
  
  console.log(`   ✓ Recommendation: ${recommendation}`);
  console.log(`   ✓ Confidence: ${confidenceLevel}/10`);
  console.log(`   ✓ Entry: $${entry} | Stop: $${stop} | Target: $${target}`);
  console.log(`   ✓ Risk/Reward: 1:${riskRewardRatio.toFixed(2)}`);
  
  // Build AnalysisPost object
  const now = new Date();
  const postId = `${ticker}-${now.getTime()}`;
  
  const analysisPost: AnalysisPost = {
    id: postId,
    title: `${ticker} Analysis - ${now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    heroImage: '', // TODO: Add chart generation
    description: `Comprehensive multi-timeframe analysis of ${ticker} including technical, fundamental, and sentiment analysis.`,
    timestamp: now,
    assetType: 'stock', // TODO: Detect from ticker
    ticker: ticker.toUpperCase(),
    
    content: {
      charts: [], // TODO: Add chart URLs
      technicalAnalysis: files.technical,
      newsSummary: files.news,
      detailedAnalysis: files.report
    },
    
    recommendation,
    entry,
    stop,
    target,
    riskRewardRatio,
    confidenceLevel,
    
    authorId: 'alpha-insights-research-team',
    views: 0,
    bookmarks: 0,
    
    searchTerms: generateSearchTerms(ticker, `${ticker} stock analysis`),
    createdAt: now,
    updatedAt: now
  };
  
  // ============================================================================
  // PREVIEW MODE (if Firebase not configured)
  // ============================================================================
  
  if (!admin || !admin.apps || admin.apps.length === 0) {
    console.log('\n📋 PREVIEW MODE - No Firebase credentials configured');
    console.log('=' .repeat(80));
    console.log(JSON.stringify(analysisPost, null, 2));
    console.log('=' .repeat(80));
    console.log('\n💡 To publish to Firestore:');
    console.log('   1. Set up Firebase Admin SDK credentials');
    console.log('   2. Initialize Firebase in this script');
    console.log('   3. Run again to publish\n');
    return;
  }
  
  // ============================================================================
  // FIRESTORE PUBLISH
  // ============================================================================
  
  try {
    console.log('\n🚀 Publishing to Firestore...');
    
    const db = admin.firestore();
    const docRef = db.collection('AnalysisPosts').doc(postId);
    
    await docRef.set(analysisPost);
    
    console.log('   ✓ Published successfully!');
    console.log(`   📄 Document ID: ${postId}`);
    console.log(`   🔗 Collection: AnalysisPosts`);
    console.log('\n✅ Analysis published to Firestore!\n');
    
  } catch (error: any) {
    console.error('\n❌ Error publishing to Firestore:');
    console.error(error.message);
    process.exit(1);
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const ticker = process.argv[2];

if (!ticker) {
  console.error('❌ Usage: npm run publish:research <TICKER>');
  console.error('   Example: npm run publish:research AAPL');
  process.exit(1);
}

publishAnalysis(ticker.toUpperCase())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
