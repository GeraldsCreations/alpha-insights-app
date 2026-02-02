# Alpha Insights Research Team Agent Roles

This directory contains the role definition files for the 6-agent research pipeline that powers Alpha Insights stock/crypto analysis.

## Agent Pipeline

The research orchestrator (`scripts/research-orchestrator.ts`) spawns these agents in sequence:

1. **World Events Analyst** (`world-events-analyst.md`)
   - Analyzes global macro context, geopolitical risks, market sentiment
   - Output: `{ticker}-world-events.md`
   - Timeout: 5 minutes

2. **Technical Analyst - ENHANCED** (`technical-analyst-enhanced.md`)
   - Chart patterns, indicators, price action analysis
   - Output: `{ticker}-technical-analysis.md`
   - Timeout: 8 minutes

3. **News Analyst - ENHANCED** (`news-analyst-enhanced.md`)
   - Recent news, earnings, management commentary with web research
   - Output: `{ticker}-news-analysis.md`
   - Timeout: 8 minutes

4. **Price Analysis Specialist - ENHANCED** (`price-analysis-enhanced.md`)
   - Multi-timeframe price dynamics, volatility, risk analysis
   - Output: `{ticker}-price-analysis.md`
   - Timeout: 8 minutes

5. **Report Writer** (`report-writer.md`)
   - Synthesizes findings from all analysts into cohesive narrative
   - Output: `{ticker}-report.md`
   - Timeout: 10 minutes
   - *Depends on: agents 1-4 completing*

6. **Verdict Analyst - ENHANCED** (`verdict-analyst-enhanced.md`)
   - Final verdict, risk assessment, scenario analysis with confidence scores
   - Output: `{ticker}-verdicts.md`
   - Timeout: 15 minutes
   - *Depends on: Report Writer completing*

## Enhanced Roles (WSJ-Quality)

The `-enhanced.md` versions include:
- ✅ Exact numbers, percentages, dollar amounts
- ✅ Historical context and comparisons
- ✅ Structured tables for clarity
- ✅ Confidence scores for predictions
- ✅ Risk quantification with specific metrics
- ✅ Multiple scenario analysis

## Legacy Roles

The non-enhanced versions are kept for reference but not used in production.

## Usage

These role files are read by spawned agents who follow the instructions to produce standardized analysis output. The orchestrator monitors progress and updates Firestore with real-time status.

See `scripts/research-orchestrator.ts` for implementation details.
