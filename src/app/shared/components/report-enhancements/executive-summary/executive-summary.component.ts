import { Component, Input } from '@angular/core';
import { AnalysisPost } from '../../../../core/models';

@Component({
  selector: 'app-executive-summary',
  templateUrl: './executive-summary.component.html',
  styleUrls: ['./executive-summary.component.scss'],
  standalone: false
})
export class ExecutiveSummaryComponent {
  @Input() post!: AnalysisPost;

  get overallVerdict(): string {
    return this.post.recommendation;
  }

  get confidenceLevel(): number {
    return this.post.confidenceLevel;
  }

  get confidenceLabel(): string {
    if (this.confidenceLevel >= 8) return 'High';
    if (this.confidenceLevel >= 5) return 'Medium';
    return 'Low';
  }

  get priceTarget(): number {
    return this.post.target;
  }

  get entryPrice(): number {
    return this.post.entry;
  }

  get stopLoss(): number {
    return this.post.stop;
  }

  get riskReward(): number {
    return this.post.riskRewardRatio;
  }

  get potentialGain(): number {
    return ((this.post.target - this.post.entry) / this.post.entry) * 100;
  }

  get potentialLoss(): number {
    return ((this.post.entry - this.post.stop) / this.post.entry) * 100;
  }

  get keyInsights(): string[] {
    // Extract key insights from content
    const insights: string[] = [];
    
    // Try multiple sources for insights
    const sources = [
      this.post.content?.detailedAnalysis,
      this.post.content?.technicalAnalysis,
      this.post.content?.newsSummary,
      this.post.description
    ];
    
    for (const text of sources) {
      if (text && insights.length < 3) {
        // Strip HTML tags first
        const cleanText = text.replace(/<[^>]*>/g, '');
        
        // Try to find sections with headers
        const sections = [
          /(?:key\s+(?:takeaways?|insights?|points?)|bottom\s+line|summary|conclusion)[:\s]+(.*?)(?:\n\n|$)/is,
          /(?:##?\s*(?:key\s+(?:takeaways?|insights?|points?)|bottom\s+line|summary))[:\s]+(.*?)(?:\n\n|$)/is
        ];
        
        for (const sectionRegex of sections) {
          const sectionMatch = cleanText.match(sectionRegex);
          if (sectionMatch) {
            // Extract bullet points from this section
            const bulletMatch = sectionMatch[1].match(/(?:^|\n)[-*•]\s*(.+?)(?:\n|$)/gm);
            if (bulletMatch) {
              insights.push(...bulletMatch.map(b => 
                b.replace(/^[-*•]\s*/, '')
                 .replace(/\*\*/g, '')
                 .trim()
                 .replace(/\.$/, '') // Remove trailing period
              ).filter(i => i.length > 10 && i.length < 200));
            }
          }
        }
        
        // If no sections found, look for any bullet points
        if (insights.length === 0) {
          const bulletMatch = cleanText.match(/(?:^|\n)[-*•]\s*(.+?)(?:\n|$)/gm);
          if (bulletMatch) {
            insights.push(...bulletMatch.slice(0, 5).map(b => 
              b.replace(/^[-*•]\s*/, '')
               .replace(/\*\*/g, '')
               .trim()
               .replace(/\.$/, '')
            ).filter(i => i.length > 10 && i.length < 200));
          }
        }
        
        // Look for key sentences (sentences with important keywords)
        if (insights.length < 3) {
          const keywordRegex = /((?:strong|bullish|bearish|support|resistance|breakout|breakdown|trend|momentum|volume|reversal|consolidation)[^.!?]*[.!?])/gi;
          const keywordMatches = cleanText.match(keywordRegex);
          if (keywordMatches) {
            insights.push(...keywordMatches.slice(0, 3).map(s => 
              s.trim().replace(/\*\*/g, '')
            ).filter(i => i.length > 15 && i.length < 200));
          }
        }
      }
    }

    // Fallback to generated insights if nothing extracted
    if (insights.length === 0) {
      if (this.post.recommendation === 'LONG') {
        insights.push(`Strong ${this.post.recommendation} signal with ${this.confidenceLabel.toLowerCase()} confidence`);
        insights.push(`Favorable risk/reward ratio of 1:${this.riskReward.toFixed(2)}`);
        insights.push(`Target upside of +${this.potentialGain.toFixed(1)}%`);
      } else if (this.post.recommendation === 'SHORT') {
        insights.push(`${this.post.recommendation} opportunity identified with ${this.confidenceLabel.toLowerCase()} confidence`);
        insights.push(`Risk/reward ratio of 1:${this.riskReward.toFixed(2)}`);
        insights.push(`Target downside of ${this.potentialGain.toFixed(1)}%`);
      } else {
        insights.push('No clear directional bias at current levels');
        insights.push('Wait for better risk/reward setup');
        insights.push('Monitor key levels for breakout');
      }
    }

    // Return top 3-5 most meaningful insights
    return insights
      .filter((insight, index, self) => self.indexOf(insight) === index) // Remove duplicates
      .slice(0, 5);
  }

  get riskRewardAssessment(): string {
    if (this.riskReward >= 3) return 'Excellent';
    if (this.riskReward >= 2) return 'Good';
    if (this.riskReward >= 1.5) return 'Fair';
    return 'Poor';
  }

  getVerdictColor(): string {
    switch (this.post.recommendation) {
      case 'LONG': return 'success';
      case 'SHORT': return 'danger';
      default: return 'warning';
    }
  }

  getVerdictIcon(): string {
    switch (this.post.recommendation) {
      case 'LONG': return 'trending-up';
      case 'SHORT': return 'trending-down';
      default: return 'remove';
    }
  }

  getConfidenceColor(): string {
    if (this.confidenceLevel >= 8) return 'success';
    if (this.confidenceLevel >= 5) return 'warning';
    return 'danger';
  }
}
