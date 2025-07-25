import { DiffResult, TextChange, EssayVersion } from './essay-diff-system';

export interface ScoreMetric {
  label: string;
  value: number; // 0-100
}

export interface SubGrade {
  label: string;
  grade: string; // A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F
}

export interface ReviewScore {
  overallScore: number; // 0-100
  metrics: ScoreMetric[];
  subGrades: SubGrade[];
  version: string;
  timestamp: Date;
}

export interface SuggestionImpact {
  suggestionId: string;
  category: string;
  region: 'beginning' | 'middle' | 'end';
  affectedMetrics: string[]; // Which metrics this suggestion improves
  affectedSubGrades: string[]; // Which sub-grades this suggestion improves
  scoreBoost: number; // 1-3 points
}

export class ProgressiveScoringSystem {
  private baselineScore: ReviewScore | null = null;
  private scoreHistory: ReviewScore[] = [];
  private suggestionImpacts: Map<string, SuggestionImpact> = new Map();

  constructor() {}

  // Set initial baseline score (first review)
  setBaselineScore(score: ReviewScore): void {
    this.baselineScore = score;
    this.scoreHistory = [score];
  }

  // Calculate progressive score based on applied suggestions and manual edits
  calculateProgressiveScore(
    currentContent: string,
    diff: DiffResult,
    appliedSuggestionIds: string[],
    previousScore?: ReviewScore
  ): ReviewScore {
    if (!this.baselineScore) {
      throw new Error('Baseline score must be set first');
    }

    const baseScore = previousScore || this.getLatestScore();
    let newScore: ReviewScore = {
      overallScore: baseScore.overallScore,
      metrics: baseScore.metrics.map(m => ({ ...m })),
      subGrades: baseScore.subGrades.map(s => ({ ...s })),
      version: `v${this.scoreHistory.length + 1}`,
      timestamp: new Date()
    };

    // Handle different types of changes
    switch (diff.changeType) {
      case 'suggestion_applied':
      case 'bulk_suggestion_applied':
        newScore = this.applySuggestionBoosts(newScore, appliedSuggestionIds, diff);
        break;
      
      case 'manual_edit':
        newScore = this.evaluateManualEdits(newScore, diff, currentContent);
        break;
        
      case 'no_change':
        // No score change
        break;
    }

    // Ensure scores don't exceed limits
    newScore = this.normalizeScores(newScore);
    
    this.scoreHistory.push(newScore);
    return newScore;
  }

  // Apply score boosts for applied suggestions (always positive)
  private applySuggestionBoosts(
    score: ReviewScore, 
    appliedSuggestionIds: string[], 
    diff: DiffResult
  ): ReviewScore {
    let totalBoost = 0;
    const metricBoosts = new Map<string, number>();
    const subGradeBoosts = new Map<string, number>();

    appliedSuggestionIds.forEach(suggestionId => {
      const impact = this.suggestionImpacts.get(suggestionId);
      if (!impact) {
        // Default boost for unknown suggestions
        totalBoost += 1;
        return;
      }

      // Apply suggestion-specific boosts
      totalBoost += impact.scoreBoost;
      
      impact.affectedMetrics.forEach(metric => {
        metricBoosts.set(metric, (metricBoosts.get(metric) || 0) + impact.scoreBoost);
      });

      impact.affectedSubGrades.forEach(subGrade => {
        subGradeBoosts.set(subGrade, (subGradeBoosts.get(subGrade) || 0) + 1);
      });
    });

    // Apply overall score boost (capped at 3 points per review)
    const cappedBoost = Math.min(3, totalBoost);
    score.overallScore = Math.min(100, score.overallScore + cappedBoost);

    // Apply metric boosts
    score.metrics = score.metrics.map(metric => ({
      ...metric,
      value: Math.min(100, metric.value + (metricBoosts.get(metric.label) || 0))
    }));

    // Apply sub-grade improvements
    score.subGrades = score.subGrades.map(subGrade => ({
      ...subGrade,
      grade: this.improveGrade(subGrade.grade, subGradeBoosts.get(subGrade.label) || 0)
    }));

    return score;
  }

  // Evaluate manual edits (can be positive or negative based on quality)
  private evaluateManualEdits(
    score: ReviewScore, 
    diff: DiffResult, 
    currentContent: string
  ): ReviewScore {
    // For manual edits, we need to analyze if the changes improved or worsened the essay
    // This would typically use AI analysis, but for now we'll use heuristics
    
    const changes = diff.changes;
    let qualityDelta = 0;
    const metricDeltas = new Map<string, number>();
    const subGradeDeltas = new Map<string, number>();

    changes.forEach(change => {
      const delta = this.evaluateChangeQuality(change, currentContent);
      qualityDelta += delta;

      // Map changes to affected metrics based on region and type
      const affectedMetrics = this.getAffectedMetricsForChange(change);
      const affectedSubGrades = this.getAffectedSubGradesForChange(change);

      affectedMetrics.forEach(metric => {
        metricDeltas.set(metric, (metricDeltas.get(metric) || 0) + delta);
      });

      affectedSubGrades.forEach(subGrade => {
        subGradeDeltas.set(subGrade, (subGradeDeltas.get(subGrade) || 0) + delta);
      });
    });

    // Apply changes (capped between -5 and +3 points)
    const cappedDelta = Math.max(-5, Math.min(3, qualityDelta));
    score.overallScore = Math.max(0, Math.min(100, score.overallScore + cappedDelta));

    // Apply metric changes
    score.metrics = score.metrics.map(metric => ({
      ...metric,
      value: Math.max(0, Math.min(100, metric.value + (metricDeltas.get(metric.label) || 0)))
    }));

    // Apply sub-grade changes
    score.subGrades = score.subGrades.map(subGrade => {
      const delta = subGradeDeltas.get(subGrade.label) || 0;
      return {
        ...subGrade,
        grade: delta > 0 ? this.improveGrade(subGrade.grade, Math.abs(delta)) : 
               delta < 0 ? this.degradeGrade(subGrade.grade, Math.abs(delta)) : 
               subGrade.grade
      };
    });

    return score;
  }

  // Heuristic evaluation of change quality
  private evaluateChangeQuality(change: TextChange, fullContent: string): number {
    const { oldText, newText, changeType } = change;
    
    // Simple heuristics for change quality
    let delta = 0;

    // Length changes
    if (newText.length > oldText.length && changeType === 'addition') {
      // Additions are generally neutral to positive if they add substance
      delta += newText.split(' ').length > 5 ? 1 : 0.5;
    } else if (newText.length < oldText.length && changeType === 'deletion') {
      // Deletions can be good (removing redundancy) or bad (removing content)
      delta += oldText.includes('very') || oldText.includes('really') ? 1 : -0.5;
    }

    // Word complexity improvements
    const complexWords = ['demonstrate', 'illustrate', 'exemplify', 'articulate'];
    const simpleWords = ['show', 'tell', 'say', 'do'];
    
    if (complexWords.some(word => newText.toLowerCase().includes(word)) &&
        simpleWords.some(word => oldText.toLowerCase().includes(word))) {
      delta += 1;
    }

    // Grammar improvements (basic detection)
    if (oldText.includes('there is') && newText.includes('there are')) delta += 0.5;
    if (oldText.includes('alot') && newText.includes('a lot')) delta += 0.5;

    return Math.max(-2, Math.min(2, delta));
  }

  // Map changes to affected metrics
  private getAffectedMetricsForChange(change: TextChange): string[] {
    const metrics: string[] = [];
    
    if (change.region === 'beginning') {
      metrics.push('Clarity');
    }
    if (change.region === 'middle') {
      metrics.push('Delivery', 'Quality');
    }
    if (change.region === 'end') {
      metrics.push('Quality');
    }

    return metrics;
  }

  // Map changes to affected sub-grades
  private getAffectedSubGradesForChange(change: TextChange): string[] {
    const subGrades: string[] = [];
    
    if (change.region === 'beginning') {
      subGrades.push('Hook', 'Structure');
    }
    if (change.region === 'middle') {
      subGrades.push('Structure', 'Uniqueness');
    }
    if (change.region === 'end') {
      subGrades.push('Structure');
    }

    return subGrades;
  }

  // Register suggestion impact for future scoring
  registerSuggestionImpact(impact: SuggestionImpact): void {
    this.suggestionImpacts.set(impact.suggestionId, impact);
  }

  // Improve a letter grade
  private improveGrade(currentGrade: string, steps: number): string {
    const grades = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
    const currentIndex = grades.indexOf(currentGrade);
    const newIndex = Math.min(grades.length - 1, currentIndex + steps);
    return grades[newIndex];
  }

  // Degrade a letter grade
  private degradeGrade(currentGrade: string, steps: number): string {
    const grades = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
    const currentIndex = grades.indexOf(currentGrade);
    const newIndex = Math.max(0, currentIndex - steps);
    return grades[newIndex];
  }

  // Normalize scores to valid ranges
  private normalizeScores(score: ReviewScore): ReviewScore {
    return {
      ...score,
      overallScore: Math.max(0, Math.min(100, score.overallScore)),
      metrics: score.metrics.map(metric => ({
        ...metric,
        value: Math.max(0, Math.min(100, metric.value))
      }))
    };
  }

  // Get latest score
  getLatestScore(): ReviewScore {
    if (this.scoreHistory.length === 0) {
      throw new Error('No scores available');
    }
    return this.scoreHistory[this.scoreHistory.length - 1];
  }

  // Get score history
  getScoreHistory(): ReviewScore[] {
    return [...this.scoreHistory];
  }

  // Get baseline score
  getBaselineScore(): ReviewScore | null {
    return this.baselineScore;
  }

  // Serialize for persistence
  serialize(): string {
    return JSON.stringify({
      baselineScore: this.baselineScore,
      scoreHistory: this.scoreHistory,
      suggestionImpacts: Array.from(this.suggestionImpacts.entries())
    });
  }

  // Deserialize from persistence
  static deserialize(data: string): ProgressiveScoringSystem {
    const system = new ProgressiveScoringSystem();
    const parsed = JSON.parse(data);
    
    system.baselineScore = parsed.baselineScore ? {
      ...parsed.baselineScore,
      timestamp: new Date(parsed.baselineScore.timestamp)
    } : null;
    
    system.scoreHistory = parsed.scoreHistory.map((score: any) => ({
      ...score,
      timestamp: new Date(score.timestamp)
    }));
    
    system.suggestionImpacts = new Map(parsed.suggestionImpacts);
    
    return system;
  }
}