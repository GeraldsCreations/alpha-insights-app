#!/usr/bin/env ts-node

/**
 * Spawn Research Agents for a Ticker
 * 
 * This script spawns all 6 research agents in the proper sequence
 * and waits for them to complete before publishing results.
 * 
 * Usage:
 *   ts-node spawn-research-agents.ts <TICKER> <ASSET_TYPE>
 *   ts-node spawn-research-agents.ts TSLA stock
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';

const execAsync = promisify(exec);

const TICKER = process.argv[2];
const ASSET_TYPE = process.argv[3] || 'stock';
const WORKSPACE = '/root/.openclaw/workspace';
const AGENT_ROLES_DIR = `${WORKSPACE}/agents/alpha-insights-team/research-team`;
const OUTPUT_DIR = `${WORKSPACE}/alpha-insights-app/research-output`;

if (!TICKER) {
  console.error('❌ Usage: spawn-research-agents.ts <TICKER> <ASSET_TYPE>');
  process.exit(1);
}

interface AgentTask {
  name: string;
  label: string;
  roleFile: string;
  outputFile: string;
  dependsOn?: string[];
}

const AGENT_PIPELINE: AgentTask[] = [
  {
    name: 'World Events Analyst',
    label: `${TICKER.toLowerCase()}-world-events`,
    roleFile: `${AGENT_ROLES_DIR}/world-events-analyst.md`,
    outputFile: `${OUTPUT_DIR}/${TICKER}-world-events.md`
  },
  {
    name: 'Technical Analysis Specialist',
    label: `${TICKER.toLowerCase()}-technical-analysis`,
    roleFile: `${AGENT_ROLES_DIR}/technical-analyst.md`,
    outputFile: `${OUTPUT_DIR}/${TICKER}-technical-analysis.md`
  },
  {
    name: 'News Analyst',
    label: `${TICKER.toLowerCase()}-news-analysis`,
    roleFile: `${AGENT_ROLES_DIR}/news-analyst.md`,
    outputFile: `${OUTPUT_DIR}/${TICKER}-news-analysis.md`
  },
  {
    name: 'Price Analysis Specialist',
    label: `${TICKER.toLowerCase()}-price-analysis`,
    roleFile: `${AGENT_ROLES_DIR}/price-analysis-specialist.md`,
    outputFile: `${OUTPUT_DIR}/${TICKER}-price-analysis.md`
  },
  {
    name: 'Report Writer',
    label: `${TICKER.toLowerCase()}-report-writer`,
    roleFile: `${AGENT_ROLES_DIR}/report-writer.md`,
    outputFile: `${OUTPUT_DIR}/${TICKER}-report.md`,
    dependsOn: ['world-events', 'technical-analysis', 'news-analysis', 'price-analysis']
  },
  {
    name: 'Verdict Analyst',
    label: `${TICKER.toLowerCase()}-verdict-analyst`,
    roleFile: `${AGENT_ROLES_DIR}/verdict-analyst.md`,
    outputFile: `${OUTPUT_DIR}/${TICKER}-verdicts.md`,
    dependsOn: ['report']
  }
];

/**
 * Wait for a file to exist
 */
async function waitForFile(filePath: string, timeoutMs: number = 600000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (fs.existsSync(filePath)) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
}

/**
 * Spawn a research agent via OpenClaw sessions_spawn
 */
async function spawnAgent(task: AgentTask): Promise<void> {
  console.log(`\n🔬 Spawning: ${task.name}`);
  
  // Check dependencies
  if (task.dependsOn) {
    console.log(`   📋 Checking dependencies: ${task.dependsOn.join(', ')}`);
    for (const dep of task.dependsOn) {
      const depFile = `${OUTPUT_DIR}/${TICKER}-${dep}.md`;
      if (!fs.existsSync(depFile)) {
        console.log(`   ⏳ Waiting for ${dep}...`);
        const success = await waitForFile(depFile);
        if (!success) {
          throw new Error(`Dependency timeout: ${dep}`);
        }
      }
    }
  }
  
  // Build task message based on agent type
  let taskMessage = '';
  
  if (task.name === 'World Events Analyst') {
    taskMessage = `You are the World Events Analyst from the Alpha Insights Research Team.

Analyze ${TICKER} for world events and macro context.

Read your role definition: ${task.roleFile}

Research current global events, macroeconomic factors, geopolitical risks, market sentiment, and sector dynamics relevant to ${TICKER}.

Write your analysis to: ${task.outputFile}

Follow the exact output format specified in your role definition. Be concise (200-300 words) but insightful. Use web_search to find recent news and macro data.

Complete this within 5 minutes.`;
  } else if (task.name === 'Technical Analysis Specialist') {
    taskMessage = `You are the Technical Analysis Specialist from the Alpha Insights Research Team.

Analyze ${TICKER} for technical chart patterns, indicators, and price action.

Read your role definition: ${task.roleFile}

Perform technical analysis on ${TICKER} including:
- Chart patterns and trends
- Key support/resistance levels
- Technical indicators (RSI, MACD, moving averages)
- Volume analysis
- Short-term outlook

Write your analysis to: ${task.outputFile}

Follow the exact output format specified in your role definition. Use web_search or financial APIs to get current price data and charts.

Complete this within 5 minutes.`;
  } else if (task.name === 'News Analyst') {
    taskMessage = `You are the News Analyst from the Alpha Insights Research Team.

Analyze ${TICKER} for recent news, company developments, and sentiment.

Read your role definition: ${task.roleFile}

Research recent news about ${TICKER} including:
- Company announcements and earnings
- Product launches and innovations
- Management changes
- Analyst ratings and estimates
- Social media sentiment

Write your analysis to: ${task.outputFile}

Follow the exact output format specified in your role definition. Use web_search to find the most recent and relevant news from the past 7-14 days.

Complete this within 5 minutes.`;
  } else if (task.name === 'Price Analysis Specialist') {
    taskMessage = `You are the Price Analysis Specialist from the Alpha Insights Research Team.

Analyze ${TICKER} for recent price action and trading behavior.

Read your role definition: ${task.roleFile}

Analyze ${TICKER}'s price action including:
- Recent price movements (1d, 1w, 1m, 3m)
- Volume patterns
- Volatility analysis
- Key price levels
- Price momentum

Write your analysis to: ${task.outputFile}

Follow the exact output format specified in your role definition. Use web_search or financial data sources to get current price and volume data.

Complete this within 5 minutes.`;
  } else if (task.name === 'Report Writer') {
    taskMessage = `You are the Report Writer from the Alpha Insights Research Team.

Write a comprehensive investment research report for ${TICKER}.

Read your role definition: ${task.roleFile}

**IMPORTANT:** All specialist reports are now complete.

Read and synthesize these files:
- ${OUTPUT_DIR}/${TICKER}-world-events.md
- ${OUTPUT_DIR}/${TICKER}-technical-analysis.md
- ${OUTPUT_DIR}/${TICKER}-news-analysis.md
- ${OUTPUT_DIR}/${TICKER}-price-analysis.md

Create a cohesive investment report that combines all insights. Write to: ${task.outputFile}

Follow the exact output format specified in your role definition. Make it comprehensive but readable.

Complete this within 10 minutes.`;
  } else if (task.name === 'Verdict Analyst') {
    taskMessage = `You are the Verdict Analyst from the Alpha Insights Research Team.

Provide final investment verdicts for ${TICKER}.

Read your role definition: ${task.roleFile}

**IMPORTANT:** The main report is now complete.

Read and analyze: ${OUTPUT_DIR}/${TICKER}-report.md

Provide clear investment verdicts:
- Short-term verdict (1-3 months)
- Medium-term verdict (3-12 months)
- Long-term verdict (1-3 years)

Write to: ${task.outputFile}

Follow the exact output format specified in your role definition. Be decisive with clear buy/hold/sell recommendations.

Complete this within 10 minutes.`;
  }
  
  // Use OpenClaw sessions_spawn via Node.js
  // We'll use a simple approach: write the task to a temp file and use openclaw CLI
  const taskFile = `/tmp/openclaw-task-${task.label}.txt`;
  fs.writeFileSync(taskFile, taskMessage);
  
  try {
    // Spawn the agent
    // Note: This assumes openclaw CLI is available. In production, you might want to use
    // the OpenClaw API directly or sessions_spawn tool
    console.log(`   🚀 Launching agent...`);
    
    // For now, we'll simulate by directly calling the agent with the task
    // In production, replace this with actual sessions_spawn call
    const cmd = `echo "${taskMessage.replace(/"/g, '\\"')}" | openclaw session send --session main --wait`;
    
    // Alternative: spawn via sessions_spawn tool (if available in TypeScript context)
    // This would require importing OpenClaw SDK
    
    console.log(`   ⏳ Waiting for ${task.name} to complete...`);
    
    // Wait for output file
    const success = await waitForFile(task.outputFile, 600000); // 10 min timeout
    
    if (success) {
      console.log(`   ✅ ${task.name} complete!`);
    } else {
      throw new Error(`Timeout waiting for ${task.outputFile}`);
    }
    
  } finally {
    // Clean up temp file
    if (fs.existsSync(taskFile)) {
      fs.unlinkSync(taskFile);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('\n' + '='.repeat(80));
  console.log(`🏭 RESEARCH PIPELINE: ${TICKER} (${ASSET_TYPE})`);
  console.log('='.repeat(80));
  
  const startTime = Date.now();
  
  try {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    // Spawn agents in sequence
    for (const task of AGENT_PIPELINE) {
      await spawnAgent(task);
    }
    
    const duration = Date.now() - startTime;
    
    console.log('\n' + '='.repeat(80));
    console.log(`✅ RESEARCH COMPLETE: ${TICKER}`);
    console.log('='.repeat(80));
    console.log(`Duration: ${(duration / 1000 / 60).toFixed(1)} minutes`);
    console.log(`\nFiles created:`);
    
    for (const task of AGENT_PIPELINE) {
      if (fs.existsSync(task.outputFile)) {
        const stats = fs.statSync(task.outputFile);
        console.log(`   ✓ ${path.basename(task.outputFile)} (${(stats.size / 1024).toFixed(1)}K)`);
      }
    }
    
    console.log('\n');
    
  } catch (error: any) {
    console.error(`\n❌ Research pipeline failed: ${error.message}`);
    process.exit(1);
  }
}

main();
