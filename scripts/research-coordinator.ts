#!/usr/bin/env ts-node

/**
 * Research Coordinator - The Brain of Alpha Insights
 * 
 * Orchestrates research pipeline execution:
 * - Daily batch: Top 20 tickers (10 crypto + 10 stocks)
 * - Custom requests: Real-time user requests
 * 
 * Uses OpenClaw sessions to spawn research agents
 * Monitors progress and publishes results to Firestore
 */

import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Firebase imports
let admin: any;
try {
  admin = require('firebase-admin');
  
  // Initialize Firebase Admin if not already initialized
  if (!admin.apps || admin.apps.length === 0) {
    const serviceAccount = require('../firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.warn('⚠️  Firebase Admin not configured. Running in dry-run mode.');
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  DAILY_CRYPTO_COUNT: 10,
  DAILY_STOCK_COUNT: 10,
  RESEARCH_OUTPUT_DIR: path.join(__dirname, '..', 'research-output'),
  COINGECKO_API: 'https://api.coingecko.com/api/v3',
  YAHOO_FINANCE_API: 'https://query1.finance.yahoo.com/v1/finance'
};

// ============================================================================
// TYPES
// ============================================================================

interface Ticker {
  symbol: string;
  type: 'crypto' | 'stock';
  marketCap: number;
  name: string;
}

interface ResearchJob {
  ticker: string;
  type: 'crypto' | 'stock';
  requestId?: string;
  userId?: string;
}

interface ResearchResult {
  ticker: string;
  success: boolean;
  reportId?: string;
  error?: string;
  duration: number;
}

// ============================================================================
// TICKER FETCHING
// ============================================================================

/**
 * Fetch top cryptocurrencies by market cap
 */
async function fetchTopCryptos(count: number): Promise<Ticker[]> {
  console.log(`📊 Fetching top ${count} cryptocurrencies...`);
  
  try {
    const response = await fetch(
      `${CONFIG.COINGECKO_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=${count}&page=1`
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.statusText}`);
    }
    
    const data: any = await response.json();
    
    const tickers: Ticker[] = data.map((coin: any) => ({
      symbol: coin.symbol.toUpperCase(),
      type: 'crypto' as const,
      marketCap: coin.market_cap,
      name: coin.name
    }));
    
    console.log(`   ✓ Fetched ${tickers.length} crypto tickers`);
    return tickers;
    
  } catch (error) {
    console.error('Error fetching crypto tickers:', error);
    
    // Fallback to hardcoded list
    console.log('   ⚠️  Using fallback crypto list');
    return [
      { symbol: 'BTC', type: 'crypto' as const, marketCap: 0, name: 'Bitcoin' },
      { symbol: 'ETH', type: 'crypto' as const, marketCap: 0, name: 'Ethereum' },
      { symbol: 'BNB', type: 'crypto' as const, marketCap: 0, name: 'Binance Coin' },
      { symbol: 'SOL', type: 'crypto' as const, marketCap: 0, name: 'Solana' },
      { symbol: 'ADA', type: 'crypto' as const, marketCap: 0, name: 'Cardano' },
      { symbol: 'XRP', type: 'crypto' as const, marketCap: 0, name: 'Ripple' },
      { symbol: 'DOT', type: 'crypto' as const, marketCap: 0, name: 'Polkadot' },
      { symbol: 'AVAX', type: 'crypto' as const, marketCap: 0, name: 'Avalanche' },
      { symbol: 'MATIC', type: 'crypto' as const, marketCap: 0, name: 'Polygon' },
      { symbol: 'LINK', type: 'crypto' as const, marketCap: 0, name: 'Chainlink' }
    ].slice(0, count);
  }
}

/**
 * Fetch top stocks by market cap
 */
async function fetchTopStocks(count: number): Promise<Ticker[]> {
  console.log(`📊 Fetching top ${count} stocks...`);
  
  // For now, use a curated list of top stocks
  // In production, integrate with a proper stock screener API
  const topStocks: Ticker[] = [
    { symbol: 'AAPL', type: 'stock', marketCap: 3000000000000, name: 'Apple Inc.' },
    { symbol: 'MSFT', type: 'stock', marketCap: 2800000000000, name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', type: 'stock', marketCap: 1800000000000, name: 'Alphabet Inc.' },
    { symbol: 'AMZN', type: 'stock', marketCap: 1600000000000, name: 'Amazon.com Inc.' },
    { symbol: 'NVDA', type: 'stock', marketCap: 1500000000000, name: 'NVIDIA Corporation' },
    { symbol: 'TSLA', type: 'stock', marketCap: 800000000000, name: 'Tesla, Inc.' },
    { symbol: 'META', type: 'stock', marketCap: 900000000000, name: 'Meta Platforms Inc.' },
    { symbol: 'BRK.B', type: 'stock', marketCap: 850000000000, name: 'Berkshire Hathaway' },
    { symbol: 'V', type: 'stock', marketCap: 550000000000, name: 'Visa Inc.' },
    { symbol: 'JNJ', type: 'stock', marketCap: 500000000000, name: 'Johnson & Johnson' },
    { symbol: 'WMT', type: 'stock', marketCap: 480000000000, name: 'Walmart Inc.' },
    { symbol: 'JPM', type: 'stock', marketCap: 470000000000, name: 'JPMorgan Chase & Co.' },
    { symbol: 'MA', type: 'stock', marketCap: 450000000000, name: 'Mastercard Inc.' },
    { symbol: 'PG', type: 'stock', marketCap: 420000000000, name: 'Procter & Gamble Co.' },
    { symbol: 'UNH', type: 'stock', marketCap: 500000000000, name: 'UnitedHealth Group' }
  ];
  
  console.log(`   ✓ Selected ${count} top stocks`);
  return topStocks.slice(0, count);
}

// ============================================================================
// RESEARCH PIPELINE EXECUTION
// ============================================================================

/**
 * Execute research pipeline for a single ticker using the orchestrator
 */
async function executeResearchPipeline(job: ResearchJob): Promise<ResearchResult> {
  console.log(`\n🔬 Starting research for ${job.ticker}...`);
  const startTime = Date.now();
  
  try {
    // Call the orchestrator script
    const orchestratorPath = path.join(__dirname, 'research-orchestrator.ts');
    const args = [job.ticker, job.type];
    
    // Add trigger ID if available (for Firestore updates)
    if (job.requestId) {
      args.push(job.requestId);
    }
    
    const cmd = `npx ts-node --project ${path.join(__dirname, 'tsconfig.json')} ${orchestratorPath} ${args.join(' ')}`;
    
    const { stdout, stderr } = await execAsync(cmd);
    
    console.log(stdout);
    if (stderr && !stderr.includes('ExperimentalWarning')) {
      console.error(stderr);
    }
    
    // Parse result from output
    const successMatch = stdout.match(/✅ RESEARCH COMPLETE/);
    const reportIdMatch = stdout.match(/Report ID: ([A-Z]+-\d+)/);
    const durationMatch = stdout.match(/Duration: ([\d.]+) minutes/);
    
    const success = !!successMatch;
    const reportId = reportIdMatch ? reportIdMatch[1] : undefined;
    const duration = durationMatch ? parseFloat(durationMatch[1]) * 60 * 1000 : 0;
    
    if (success) {
      console.log(`   ✅ Research complete for ${job.ticker} (${(duration / 1000).toFixed(1)}s)`);
    }
    
    return {
      ticker: job.ticker,
      success,
      reportId,
      duration
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`   ❌ Research failed for ${job.ticker}:`, error.message);
    
    return {
      ticker: job.ticker,
      success: false,
      error: error.message,
      duration
    };
  }
}

/**
 * Publish analysis to Firestore
 */
async function publishAnalysis(ticker: string): Promise<{ success: boolean; reportId?: string; error?: string }> {
  try {
    // Check if research files exist
    const files = [
      `${ticker}-report.md`,
      `${ticker}-verdicts.md`,
      `${ticker}-technical-analysis.md`,
      `${ticker}-news-analysis.md`
    ];
    
    for (const file of files) {
      const filePath = path.join(CONFIG.RESEARCH_OUTPUT_DIR, file);
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `Missing research file: ${file}`
        };
      }
    }
    
    // Run the publish script
    const { stdout, stderr } = await execAsync(
      `cd ${path.join(__dirname, '..')} && npx ts-node scripts/publish-analysis.ts ${ticker}`
    );
    
    // Extract report ID from output (assuming publish script outputs it)
    const reportId = `${ticker}-${Date.now()}`;
    
    return {
      success: true,
      reportId
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message
    };
  }
}

// ============================================================================
// BATCH PROCESSING
// ============================================================================

/**
 * Run daily batch research for top tickers
 */
async function runDailyBatch(): Promise<void> {
  console.log('\n' + '='.repeat(80));
  console.log('🏭 DAILY BATCH RESEARCH - Alpha Insights');
  console.log('='.repeat(80));
  console.log(`Started: ${new Date().toLocaleString()}\n`);
  
  const startTime = Date.now();
  
  try {
    // Fetch top tickers
    const [cryptos, stocks] = await Promise.all([
      fetchTopCryptos(CONFIG.DAILY_CRYPTO_COUNT),
      fetchTopStocks(CONFIG.DAILY_STOCK_COUNT)
    ]);
    
    const allTickers = [...cryptos, ...stocks];
    console.log(`\n📋 Processing ${allTickers.length} tickers:\n`);
    allTickers.forEach(t => console.log(`   - ${t.symbol} (${t.type})`));
    
    // Create research jobs
    const jobs: ResearchJob[] = allTickers.map(t => ({
      ticker: t.symbol,
      type: t.type
    }));
    
    // Execute research pipeline for each ticker
    // Process sequentially to avoid overloading the system
    const results: ResearchResult[] = [];
    
    for (const job of jobs) {
      const result = await executeResearchPipeline(job);
      results.push(result);
      
      // Brief pause between jobs
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Log summary
    const totalDuration = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 BATCH SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total tickers: ${results.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    console.log(`⏱️  Total time: ${(totalDuration / 1000 / 60).toFixed(1)} minutes`);
    console.log(`⏱️  Avg time per ticker: ${(totalDuration / results.length / 1000).toFixed(1)}s`);
    
    if (failureCount > 0) {
      console.log('\n⚠️  Failed tickers:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   - ${r.ticker}: ${r.error}`);
      });
    }
    
    // Log to Firestore (if configured)
    if (admin) {
      await logBatchResults(results, totalDuration);
    }
    
    console.log('\n✅ Daily batch complete!\n');
    
  } catch (error) {
    console.error('\n❌ Fatal error in daily batch:', error);
    throw error;
  }
}

/**
 * Log batch results to Firestore
 */
async function logBatchResults(results: ResearchResult[], duration: number): Promise<void> {
  try {
    const db = admin.firestore();
    
    await db.collection('BatchLogs').add({
      type: 'daily_batch',
      totalTickers: results.length,
      successCount: results.filter(r => r.success).length,
      failureCount: results.filter(r => !r.success).length,
      duration,
      results: results.map(r => ({
        ticker: r.ticker,
        success: r.success,
        reportId: r.reportId,
        error: r.error,
        duration: r.duration
      })),
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('   ✓ Logged batch results to Firestore');
    
  } catch (error) {
    console.error('Error logging batch results:', error);
  }
}

// ============================================================================
// CUSTOM REQUEST MONITORING
// ============================================================================

/**
 * Monitor Firestore for new custom research triggers
 */
async function monitorCustomRequests(): Promise<void> {
  if (!admin) {
    console.log('⚠️  Firebase not configured. Cannot monitor custom requests.');
    return;
  }
  
  console.log('\n👂 Monitoring custom research requests...\n');
  
  const db = admin.firestore();
  
  // Listen for new research triggers
  const unsubscribe = db.collection('ResearchTriggers')
    .where('status', '==', 'pending')
    .onSnapshot(async (snapshot: any) => {
      if (snapshot.empty) {
        return;
      }
      
      console.log(`📨 Received ${snapshot.size} new research triggers`);
      
      for (const doc of snapshot.docs) {
        const trigger = doc.data();
        
        // Mark as processing
        await doc.ref.update({
          status: 'processing',
          processingStartedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`\n🔬 Processing custom request for ${trigger.ticker}...`);
        
        // Execute research pipeline - use doc.id as triggerId for unique filenames
        const job: ResearchJob = {
          ticker: trigger.ticker,
          type: trigger.assetType,
          requestId: doc.id,  // Use Firestore doc ID for unique filenames
          userId: trigger.userId
        };
        
        const result = await executeResearchPipeline(job);
        
        // Update trigger with result (only include defined values)
        const updateData: any = {
          status: 'complete',
          success: result.success,
          duration: result.duration,
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        if (result.reportId) updateData.reportId = result.reportId;
        if (result.error) updateData.error = result.error;
        
        await doc.ref.update(updateData);
        
        if (result.success) {
          console.log(`   ✅ Custom request complete: ${trigger.ticker}`);
        } else {
          console.log(`   ❌ Custom request failed: ${trigger.ticker}`);
        }
      }
    });
  
  // Keep the process running
  console.log('👂 Listener active. Press Ctrl+C to stop.\n');
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

const command = process.argv[2];

async function main() {
  switch (command) {
    case 'daily':
      // Run daily batch
      await runDailyBatch();
      process.exit(0);
      break;
      
    case 'monitor':
      // Monitor custom requests (runs continuously)
      await monitorCustomRequests();
      break;
      
    case 'test':
      // Test with a single ticker
      const ticker = process.argv[3];
      if (!ticker) {
        console.error('Usage: npm run coordinator:test <TICKER>');
        process.exit(1);
      }
      
      const result = await executeResearchPipeline({
        ticker: ticker.toUpperCase(),
        type: 'stock'
      });
      
      console.log('\nResult:', result);
      process.exit(result.success ? 0 : 1);
      break;
      
    default:
      console.error('Usage:');
      console.error('  npm run coordinator:daily   - Run daily batch');
      console.error('  npm run coordinator:monitor - Monitor custom requests');
      console.error('  npm run coordinator:test <TICKER> - Test single ticker');
      process.exit(1);
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
