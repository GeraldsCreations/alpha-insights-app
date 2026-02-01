import { Component, Input, OnInit } from '@angular/core';

export interface VerdictData {
  timeframe: string;
  verdict: 'BUY' | 'SELL' | 'HOLD' | 'UNKNOWN';
  confidence: number;
}

export interface VerdictDataRaw {
  timeframe: string;
  verdict: 'BUY' | 'SELL' | 'HOLD' | 'UNKNOWN';
  confidence: number | string; // Accept both number and "High/Medium/Low" string
}

@Component({
  selector: 'app-verdict-timeline',
  templateUrl: './verdict-timeline.component.html',
  styleUrls: ['./verdict-timeline.component.scss'],
  standalone: false
})
export class VerdictTimelineComponent implements OnInit {
  @Input() verdicts: VerdictDataRaw[] = [];
  
  displayVerdicts: VerdictData[] = [];

  ngOnInit() {
    this.prepareTimelineData();
  }

  ngOnChanges() {
    this.prepareTimelineData();
  }

  /**
   * Convert confidence string to number
   */
  private convertConfidence(confidence: number | string): number {
    if (typeof confidence === 'number') return confidence;
    
    switch (confidence) {
      case 'High': return 80;
      case 'Medium': return 60;
      case 'Low': return 40;
      default: return 0;
    }
  }

  prepareTimelineData() {
    // Map database timeframes to display timeframes
    const timeframeMap: Record<string, string> = {
      '5 Minute': '5-Min',
      '15 Minute': '15-Min',
      '1 Hour': '1-Hour',
      '4 Hour': '4-Hour',
      '24 Hour': 'Daily',
      '1 Week': 'Weekly',
      '1 Month': 'Monthly',
      '1 Year': 'Yearly'
    };
    
    // Ensure we have verdicts for all timeframes
    const timeframes = ['5-Min', '15-Min', '1-Hour', '4-Hour', 'Daily', 'Weekly'];
    
    this.displayVerdicts = timeframes.map(displayTf => {
      // Find matching verdict by checking both display name and database name
      const existing = this.verdicts.find(v => {
        const mappedName = timeframeMap[v.timeframe];
        return v.timeframe === displayTf || mappedName === displayTf;
      });
      
      return existing ? {
        ...existing,
        timeframe: displayTf, // Normalize to display name
        confidence: this.convertConfidence(existing.confidence) // Convert to number
      } : {
        timeframe: displayTf,
        verdict: 'UNKNOWN' as const,
        confidence: 0
      };
    });
  }

  getVerdictColor(verdict: string): string {
    switch (verdict) {
      case 'BUY':
        return 'success';
      case 'SELL':
        return 'danger';
      case 'HOLD':
        return 'warning';
      default:
        return 'medium';
    }
  }

  getVerdictIcon(verdict: string): string {
    switch (verdict) {
      case 'BUY':
        return 'arrow-up-circle';
      case 'SELL':
        return 'arrow-down-circle';
      case 'HOLD':
        return 'remove-circle';
      default:
        return 'help-circle';
    }
  }

  getTimeframeClass(timeframe: string): string {
    if (timeframe.includes('Min')) return 'scalp';
    if (timeframe.includes('Hour')) return 'intraday';
    if (timeframe.includes('Daily')) return 'swing';
    return 'position';
  }

  getConfidenceClass(confidence: number): string {
    if (confidence >= 80) return 'very-high';
    if (confidence >= 60) return 'high';
    if (confidence >= 40) return 'medium';
    if (confidence > 0) return 'low';
    return 'none';
  }

  getOverallConsensus(): { verdict: string; strength: string; color: string } {
    if (this.displayVerdicts.length === 0) {
      return { verdict: 'UNKNOWN', strength: 'No data', color: 'medium' };
    }

    // Count verdicts
    const counts = {
      BUY: 0,
      SELL: 0,
      HOLD: 0,
      UNKNOWN: 0
    };

    this.displayVerdicts.forEach(v => {
      counts[v.verdict]++;
    });

    // Determine consensus
    const total = this.displayVerdicts.filter(v => v.verdict !== 'UNKNOWN').length;
    const buyPercent = (counts.BUY / total) * 100;
    const sellPercent = (counts.SELL / total) * 100;

    if (buyPercent >= 60) {
      return { verdict: 'BUY', strength: 'Strong', color: 'success' };
    } else if (buyPercent >= 40) {
      return { verdict: 'BUY', strength: 'Moderate', color: 'success' };
    } else if (sellPercent >= 60) {
      return { verdict: 'SELL', strength: 'Strong', color: 'danger' };
    } else if (sellPercent >= 40) {
      return { verdict: 'SELL', strength: 'Moderate', color: 'danger' };
    } else {
      return { verdict: 'MIXED', strength: 'No clear consensus', color: 'warning' };
    }
  }
}
