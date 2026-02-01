#!/usr/bin/env ts-node

/**
 * Research Orchestrator - Automated Agent Pipeline
 * 
 * Spawns all 6 research agents for a ticker and monitors progress
 * Updates Firestore in real-time with status
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

const execAsync = promisify(exec);

// Gateway config
const GATEWAY_URL = 'http://127.0.0.1:18789';
const GATEWAY_TOKEN = 'e5f0e50135acbc3ab23df786bfac7a89c842429eeaee2c17';

/**
 * Spawn an agent session via Gateway HTTP API
 */
async function spawnAgentSession(label: string, task: string): Promise<{ sessionKey: string; runId: string }> {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      tool: 'sessions_spawn',
      args: {
        agentId: 'main',
        label,
        task,
        cleanup: 'keep'
      }
    });

    const options = {
      hostname: '127.0.0.1',
      port: 18789,
      path: '/tools/invoke',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${GATEWAY_TOKEN}`
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const response = JSON.parse(data);
            if (response.ok && response.result) {
              resolve({ 
                sessionKey: response.result.childSessionKey, 
                runId: response.result.runId 
              });
            } else {
              reject(new Error(`Spawn failed: ${data}`));
            }
          } catch (e) {
            reject(new Error(`Failed to parse spawn response: ${data}`));
          }
        } else {
          reject(new Error(`Spawn failed: HTTP ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Spawn request failed: ${e.message}`));
    });

    req.write(postData);
    req.end();
  });
}

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
  console.warn('⚠️  Firebase Admin not configured. Status updates disabled.');
}

interface AgentTask {
  id: string;
  name: string;
  roleFile: string;
  outputFile: string;
  dependsOn?: string[];
  timeoutMinutes: number;
}

interface OrchestrationResult {
  success: boolean;
  completedAgents: string[];
  failedAgent?: string;
  error?: string;
  duration: number;
  reportId?: string;
}

/**
 * Define the 6-agent research pipeline
 */
function getAgentPipeline(ticker: string, assetType: 'crypto' | 'stock' | 'commodity', triggerId?: string): AgentTask[] {
  const workspaceDir = '/root/.openclaw/workspace';
  const agentRolesDir = `${workspaceDir}/agents/alpha-insights-team/research-team`;
  const outputDir = `${workspaceDir}/alpha-insights-app/research-output`;
  
  // Use trigger ID as prefix to allow multiple concurrent requests for same ticker
  const filePrefix = triggerId ? `${triggerId}-${ticker}` : ticker;
  
  return [
    {
      id: 'world-events',
      name: 'World Events Analyst',
      roleFile: `${agentRolesDir}/world-events-analyst.md`,
      outputFile: `${outputDir}/${filePrefix}-world-events.md`,
      timeoutMinutes: 5
    },
    {
      id: 'technical',
      name: 'Technical Analyst',
      roleFile: `${agentRolesDir}/technical-analyst.md`,
      outputFile: `${outputDir}/${filePrefix}-technical-analysis.md`,
      timeoutMinutes: 5
    },
    {
      id: 'news',
      name: 'News Analyst',
      roleFile: `${agentRolesDir}/news-analyst.md`,
      outputFile: `${outputDir}/${filePrefix}-news-analysis.md`,
      timeoutMinutes: 5
    },
    {
      id: 'price',
      name: 'Price Analysis Specialist',
      roleFile: `${agentRolesDir}/price-analysis-specialist.md`,
      outputFile: `${outputDir}/${filePrefix}-price-analysis.md`,
      timeoutMinutes: 5
    },
    {
      id: 'report',
      name: 'Report Writer',
      roleFile: `${agentRolesDir}/report-writer.md`,
      outputFile: `${outputDir}/${filePrefix}-report.md`,
      dependsOn: ['world-events', 'technical', 'news', 'price'],
      timeoutMinutes: 10
    },
    {
      id: 'verdicts',
      name: 'Verdict Analyst',
      roleFile: `${agentRolesDir}/verdict-analyst.md`,
      outputFile: `${outputDir}/${filePrefix}-verdicts.md`,
      dependsOn: ['report'],
      timeoutMinutes: 10
    }
  ];
}

/**
 * Build agent task message
 */
function buildTaskMessage(agent: AgentTask, ticker: string, assetType: string): string {
  const outputDir = path.dirname(agent.outputFile);
  
  switch (agent.id) {
    case 'world-events':
      return `You are the World Events Analyst from the Alpha Insights Research Team.

Analyze ${ticker} (${assetType}) for world events and macro context.

Read your role definition: ${agent.roleFile}

Research current global events, macroeconomic factors, geopolitical risks, market sentiment, and sector dynamics relevant to ${ticker}.

Write your analysis to: ${agent.outputFile}

Follow the exact output format specified in your role definition. Be concise (200-300 words) but insightful. Use web_search to find recent news and macro data.

Complete this within ${agent.timeoutMinutes} minutes.`;

    case 'technical':
      return `You are the Technical Analysis Specialist from the Alpha Insights Research Team.

Analyze ${ticker} (${assetType}) for technical chart patterns, indicators, and price action.

Read your role definition: ${agent.roleFile}

Perform technical analysis on ${ticker} including:
- Chart patterns and trends
- Key support/resistance levels
- Technical indicators (RSI, MACD, moving averages)
- Volume analysis
- Short-term outlook

Write your analysis to: ${agent.outputFile}

Follow the exact output format specified in your role definition. Use web_search or financial APIs to get current price data.

Complete this within ${agent.timeoutMinutes} minutes.`;

    case 'news':
      return `You are the News Analyst from the Alpha Insights Research Team.

Analyze ${ticker} (${assetType}) for recent news, company developments, and sentiment.

Read your role definition: ${agent.roleFile}

Research recent news about ${ticker} including:
- Company announcements and earnings
- Product launches and innovations
- Management changes
- Analyst ratings and estimates
- Social media sentiment

Write your analysis to: ${agent.outputFile}

Follow the exact output format specified in your role definition. Use web_search to find the most recent and relevant news from the past 7-14 days.

Complete this within ${agent.timeoutMinutes} minutes.`;

    case 'price':
      return `You are the Price Analysis Specialist from the Alpha Insights Research Team.

Analyze ${ticker} (${assetType}) for recent price action and trading behavior.

Read your role definition: ${agent.roleFile}

Analyze ${ticker}'s price action including:
- Recent price movements (1d, 1w, 1m, 3m)
- Volume patterns
- Volatility analysis
- Key price levels
- Price momentum

Write your analysis to: ${agent.outputFile}

Follow the exact output format specified in your role definition. Use web_search or financial data sources to get current price and volume data.

Complete this within ${agent.timeoutMinutes} minutes.`;

    case 'report':
      return `You are the Report Writer from the Alpha Insights Research Team.

Write a comprehensive investment research report for ${ticker} (${assetType}).

Read your role definition: ${agent.roleFile}

**All specialist reports are complete.**

Read and synthesize these files:
- ${outputDir}/${ticker}-world-events.md
- ${outputDir}/${ticker}-technical-analysis.md
- ${outputDir}/${ticker}-news-analysis.md
- ${outputDir}/${ticker}-price-analysis.md

Create a cohesive investment report that combines all insights. Write to: ${agent.outputFile}

Follow the exact output format specified in your role definition. Make it comprehensive but readable (800-1200 words).

Complete this within ${agent.timeoutMinutes} minutes.`;

    case 'verdicts':
      return `You are the Verdict Analyst from the Alpha Insights Research Team.

Provide final investment verdicts for ${ticker} (${assetType}).

Read your role definition: ${agent.roleFile}

**The comprehensive report is complete.**

Read and analyze: ${outputDir}/${ticker}-report.md

Provide clear investment verdicts across multiple timeframes:
- 5 minute, 1 hour, 4 hour
- 24 hour, 1 week, 1 month
- 1 year

Write to: ${agent.outputFile}

Follow the exact output format specified in your role definition. Be decisive with clear BUY/HOLD/SELL recommendations and confidence levels.

Complete this within ${agent.timeoutMinutes} minutes.`;

    default:
      throw new Error(`Unknown agent: ${agent.id}`);
  }
}

/**
 * Update ResearchTrigger status in Firestore
 */
async function updateTriggerStatus(
  triggerId: string,
  update: {
    status?: string;
    currentAgent?: string;
    completedAgents?: string[];
    progress?: number;
    error?: string;
  }
): Promise<void> {
  if (!admin) {
    console.log(`   [Firestore disabled] Would update trigger ${triggerId}:`, update);
    return;
  }
  
  try {
    const db = admin.firestore();
    await db.collection('ResearchTriggers').doc(triggerId).update({
      ...update,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`   ✓ Updated Firestore: ${update.status || update.currentAgent}`);
  } catch (error: any) {
    console.error(`   ⚠️  Failed to update Firestore:`, error.message);
  }
}

/**
 * Spawn a single research agent
 */
async function spawnAgent(
  agent: AgentTask,
  ticker: string,
  assetType: string,
  triggerId?: string
): Promise<boolean> {
  console.log(`\n🔬 Agent ${agent.name}`);
  
  // Update Firestore - starting this agent
  if (triggerId) {
    await updateTriggerStatus(triggerId, {
      currentAgent: agent.name,
      status: 'processing'
    });
  }
  
  // Check dependencies
  if (agent.dependsOn) {
    console.log(`   📋 Dependencies: ${agent.dependsOn.join(', ')}`);
    const outputDir = path.dirname(agent.outputFile);
    // Extract the file prefix from the current agent's output file
    const baseFilename = path.basename(agent.outputFile);
    const filePrefix = baseFilename.split('-').slice(0, -1).join('-');
    
    const depFileMap: Record<string, string> = {
      'world-events': `${outputDir}/${filePrefix}-world-events.md`,
      'technical': `${outputDir}/${filePrefix}-technical-analysis.md`,
      'news': `${outputDir}/${filePrefix}-news-analysis.md`,
      'price': `${outputDir}/${filePrefix}-price-analysis.md`,
      'report': `${outputDir}/${filePrefix}-report.md`
    };
    
    for (const dep of agent.dependsOn) {
      const depFile = depFileMap[dep];
      if (!depFile || !fs.existsSync(depFile)) {
        throw new Error(`Missing dependency: ${depFile || dep}`);
      }
    }
  }
  
  const taskMessage = buildTaskMessage(agent, ticker, assetType);
  
  // Spawn via Gateway HTTP API
  console.log(`   🚀 Spawning agent...`);
  
  const label = `${ticker.toLowerCase()}-${agent.id}`;
  
  try {
    // Spawn the agent via HTTP API
    const spawnResult = await spawnAgentSession(label, taskMessage);
    console.log(`   ✓ Agent spawned: ${spawnResult.sessionKey}`);
    
    // Wait for output file to be created
    console.log(`   ⏳ Waiting for output file...`);
    
    const startTime = Date.now();
    const timeoutMs = agent.timeoutMinutes * 60 * 1000;
    
    while (Date.now() - startTime < timeoutMs) {
      if (fs.existsSync(agent.outputFile)) {
        const stats = fs.statSync(agent.outputFile);
        if (stats.size > 100) { // At least 100 bytes to ensure it's written
          console.log(`   ✅ Complete! (${(stats.size / 1024).toFixed(1)}KB)`);
          return true;
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    throw new Error(`Timeout waiting for ${agent.outputFile}`);
    
  } catch (error: any) {
    console.error(`   ❌ Agent failed:`, error.message);
    throw error;
  }
}

/**
 * Execute full research pipeline for a ticker
 */
export async function orchestrateResearch(
  ticker: string,
  assetType: 'crypto' | 'stock' | 'commodity',
  triggerId?: string
): Promise<OrchestrationResult> {
  
  console.log('\n' + '='.repeat(80));
  console.log(`🏭 RESEARCH ORCHESTRATION: ${ticker} (${assetType})`);
  if (triggerId) {
    console.log(`Trigger ID: ${triggerId}`);
  }
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  const pipeline = getAgentPipeline(ticker, assetType, triggerId);
  const completedAgents: string[] = [];
  
  try {
    // Update trigger - starting research
    if (triggerId) {
      await updateTriggerStatus(triggerId, {
        status: 'processing',
        progress: 0,
        currentAgent: pipeline[0].name
      });
    }
    
    // Execute agents sequentially
    for (let i = 0; i < pipeline.length; i++) {
      const agent = pipeline[i];
      
      await spawnAgent(agent, ticker, assetType, triggerId);
      
      completedAgents.push(agent.id);
      const progress = Math.round(((i + 1) / pipeline.length) * 100);
      
      // Update Firestore - agent complete
      if (triggerId) {
        await updateTriggerStatus(triggerId, {
          completedAgents,
          progress
        });
      }
      
      // Brief pause between agents
      if (i < pipeline.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // All agents complete - publish to Firestore
    console.log(`\n📤 Publishing results to Firestore...`);
    
    const publishScript = path.join(__dirname, 'publish-to-firestore.ts');
    const credentialsPath = path.join(__dirname, '..', 'firebase-service-account.json');
    const requestId = triggerId || `${ticker}-${Date.now()}`;
    
    const publishCmd = `cd /root/.openclaw/workspace/alpha-insights-app && GOOGLE_APPLICATION_CREDENTIALS=${credentialsPath} npx ts-node ${publishScript} ${requestId} ${ticker} ${assetType}`;
    
    try {
      const { stdout } = await execAsync(publishCmd);
      
      // Extract report ID from publish output (format: "Document ID: TICKER-timestamp")
      const reportIdMatch = stdout.match(/Document ID: ([A-Z]+-\d+)/);
      const reportId = reportIdMatch ? reportIdMatch[1] : `${ticker}-${Date.now()}`;
      
      console.log(`   ✓ Published! Report ID: ${reportId}`);
      
      const duration = Date.now() - startTime;
      
      console.log('\n' + '='.repeat(80));
      console.log(`✅ RESEARCH COMPLETE: ${ticker}`);
      console.log('='.repeat(80));
      console.log(`Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
      console.log(`Report ID: ${reportId}`);
      console.log('');
      
      // Update trigger - complete!
      if (triggerId) {
        await updateTriggerStatus(triggerId, {
          status: 'complete',
          progress: 100,
          currentAgent: 'Complete'
        });
        
        // Also update the trigger document directly with success info
        if (admin) {
          const db = admin.firestore();
          await db.collection('ResearchTriggers').doc(triggerId).update({
            success: true,
            reportId,
            duration,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      
      return {
        success: true,
        completedAgents,
        duration,
        reportId
      };
      
    } catch (publishError: any) {
      console.error(`   ⚠️  Publish failed: ${publishError.message}`);
      console.error(`   Research files are complete but not published to Firestore`);
      
      // Still mark as complete since research is done, just publish failed
      const duration = Date.now() - startTime;
      const reportId = `${ticker}-${Date.now()}`;
      
      if (triggerId) {
        await updateTriggerStatus(triggerId, {
          status: 'complete',
          progress: 100,
          currentAgent: 'Complete (publish failed)'
        });
        
        if (admin) {
          const db = admin.firestore();
          await db.collection('ResearchTriggers').doc(triggerId).update({
            success: true,
            reportId,
            duration,
            publishError: publishError.message,
            completedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      
      return {
        success: true,
        completedAgents,
        duration,
        reportId
      };
    }
    
  } catch (error: any) {
    const duration = Date.now() - startTime;
    
    console.error(`\n❌ Orchestration failed:`, error.message);
    
    // Update trigger - failed
    if (triggerId) {
      await updateTriggerStatus(triggerId, {
        status: 'failed',
        error: error.message
      });
      
      if (admin) {
        const db = admin.firestore();
        await db.collection('ResearchTriggers').doc(triggerId).update({
          success: false,
          error: error.message,
          duration,
          completedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
    }
    
    return {
      success: false,
      completedAgents,
      failedAgent: pipeline[completedAgents.length]?.name,
      error: error.message,
      duration
    };
  }
}

// CLI usage
if (require.main === module) {
  const ticker = process.argv[2];
  const assetType = (process.argv[3] || 'stock') as 'crypto' | 'stock' | 'commodity';
  const triggerId = process.argv[4];
  
  if (!ticker) {
    console.error('Usage: research-orchestrator.ts <TICKER> <ASSET_TYPE> [TRIGGER_ID]');
    process.exit(1);
  }
  
  orchestrateResearch(ticker, assetType, triggerId)
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}
