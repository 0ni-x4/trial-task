import { EssayReview, EssayMetric, EssaySubGrade } from './types';
import { VersionDiff, RegionChange } from './version-tracker';

export interface ScoreUpdate {
  overallScore: number;
  metrics: EssayMetric[];
  subGrades: EssaySubGrade[];
  scoreChanges: ScoreChange[];
}

export interface ScoreChange {
  category: string;
  previousScore: number;
  newScore: number;
  change: number;
  reason: string;
}

export class ScoreCalculator {
  /**
   * Calculate score updates based on detected changes
   */
  static calculateScoreUpdate(
    previousReview: EssayReview,
    versionDiff: VersionDiff
  ): ScoreUpdate {
    const { changes, appliedSuggestions, manualEdits } = versionDiff;
    
    // Start with previous scores
    let overallScore = previousReview.overallScore;
    let metrics = [...previousReview.metrics];
    let subGrades = [...previousReview.subGrades];
    const scoreChanges: ScoreChange[] = [];
    
    // Calculate score changes based on change type
    if (versionDiff.type === 'suggestion_applied') {
      const update = this.calculateSuggestionAppliedScores(
        previousReview, appliedSuggestions, changes
      );
      overallScore = update.overallScore;
      metrics = update.metrics;
      subGrades = update.subGrades;
      scoreChanges.push(...update.scoreChanges);
    } else if (versionDiff.type === 'manual_edit') {
      const update = this.calculateManualEditScores(
        previousReview, manualEdits, changes
      );
      overallScore = update.overallScore;
      metrics = update.metrics;
      subGrades = update.subGrades;
      scoreChanges.push(...update.scoreChanges);
    } else if (versionDiff.type === 'mixed') {
      const update = this.calculateMixedChangeScores(
        previousReview, appliedSuggestions, manualEdits, changes
      );
      overallScore = update.overallScore;
      metrics = update.metrics;
      subGrades = update.subGrades;
      scoreChanges.push(...update.scoreChanges);
    }
    
    return {
      overallScore: Math.max(0, Math.min(100, overallScore)),
      metrics: metrics.map(metric => ({
        ...metric,
        value: Math.max(0, Math.min(100, metric.value))
      })),
      subGrades,
      scoreChanges
    };
  }

  /**
   * Calculate scores when suggestions are applied
   */
  private static calculateSuggestionAppliedScores(
    previousReview: EssayReview,
    appliedSuggestions: any[],
    changes: RegionChange[]
  ): ScoreUpdate {
    let overallScore = previousReview.overallScore;
    let metrics = [...previousReview.metrics];
    let subGrades = [...previousReview.subGrades];
    const scoreChanges: ScoreChange[] = [];
    
    // Calculate improvement based on number and type of applied suggestions
    const improvementPerSuggestion = 2; // Base improvement per suggestion
    let totalImprovement = appliedSuggestions.length * improvementPerSuggestion;
    
    // ENSURE MINIMUM INCREASE: If 2+ suggestions applied, increase by at least 1
    if (appliedSuggestions.length >= 2) {
      const minimumIncrease = 1;
      const calculatedIncrease = totalImprovement;
      totalImprovement = Math.max(minimumIncrease, calculatedIncrease);
      
      console.log('📈 ENFORCING MINIMUM SCORE INCREASE:', {
        appliedSuggestions: appliedSuggestions.length,
        calculatedIncrease,
        finalIncrease: totalImprovement
      });
    }
    
    // Apply overall score improvement
    const previousOverall = overallScore;
    overallScore = Math.min(100, overallScore + totalImprovement);
    
    if (overallScore !== previousOverall) {
      scoreChanges.push({
        category: 'Overall',
        previousScore: previousOverall,
        newScore: overallScore,
        change: overallScore - previousOverall,
        reason: `Applied ${appliedSuggestions.length} suggestions${appliedSuggestions.length >= 2 ? ' (minimum increase enforced)' : ''}`
      });
    }
    
    // Update metrics based on affected regions
    for (const change of changes) {
      for (const metricName of change.affectedMetrics) {
        const metricIndex = metrics.findIndex(m => m.label === metricName);
        if (metricIndex !== -1) {
          const previousValue = metrics[metricIndex].value;
          const improvement = change.quality === 'improved' ? 3 : 1;
          metrics[metricIndex].value = Math.min(100, previousValue + improvement);
          
          scoreChanges.push({
            category: metricName,
            previousScore: previousValue,
            newScore: metrics[metricIndex].value,
            change: improvement,
            reason: `Applied suggestions improved ${metricName.toLowerCase()}`
          });
        }
      }
    }
    
    // Update sub-grades based on improvements
    subGrades = this.updateSubGrades(subGrades, changes, 'improved');
    
    return { overallScore, metrics, subGrades, scoreChanges };
  }

  /**
   * Calculate scores when manual edits are made
   */
  private static calculateManualEditScores(
    previousReview: EssayReview,
    manualEdits: any[],
    changes: RegionChange[]
  ): ScoreUpdate {
    let overallScore = previousReview.overallScore;
    let metrics = [...previousReview.metrics];
    let subGrades = [...previousReview.subGrades];
    const scoreChanges: ScoreChange[] = [];
    
    // Calculate score changes based on quality of manual edits
    let totalChange = 0;
    
    for (const change of changes) {
      let changeAmount = 0;
      
      if (change.quality === 'improved') {
        changeAmount = 2; // Manual improvements get moderate boost
      } else if (change.quality === 'degraded') {
        changeAmount = -3; // Manual degradations get significant penalty
      }
      
      totalChange += changeAmount;
      
      // Update specific metrics based on affected regions
      for (const metricName of change.affectedMetrics) {
        const metricIndex = metrics.findIndex(m => m.label === metricName);
        if (metricIndex !== -1) {
          const previousValue = metrics[metricIndex].value;
          metrics[metricIndex].value = Math.max(0, Math.min(100, previousValue + changeAmount));
          
          scoreChanges.push({
            category: metricName,
            previousScore: previousValue,
            newScore: metrics[metricIndex].value,
            change: changeAmount,
            reason: `Manual edit ${change.quality} ${metricName.toLowerCase()}`
          });
        }
      }
    }
    
    // Apply overall score change
    const previousOverall = overallScore;
    overallScore = Math.max(0, Math.min(100, overallScore + totalChange));
    
    if (overallScore !== previousOverall) {
      scoreChanges.push({
        category: 'Overall',
        previousScore: previousOverall,
        newScore: overallScore,
        change: overallScore - previousOverall,
        reason: `Manual edits ${totalChange > 0 ? 'improved' : 'degraded'} quality`
      });
    }
    
    // Update sub-grades based on changes
    subGrades = this.updateSubGrades(subGrades, changes, 'mixed');
    
    return { overallScore, metrics, subGrades, scoreChanges };
  }

  /**
   * Calculate scores for mixed changes (both suggestions and manual edits)
   */
  private static calculateMixedChangeScores(
    previousReview: EssayReview,
    appliedSuggestions: any[],
    manualEdits: any[],
    changes: RegionChange[]
  ): ScoreUpdate {
    let overallScore = previousReview.overallScore;
    let metrics = [...previousReview.metrics];
    let subGrades = [...previousReview.subGrades];
    const scoreChanges: ScoreChange[] = [];
    
    // Calculate suggestion improvements
    let suggestionImprovement = appliedSuggestions.length * 2;
    
    // ENSURE MINIMUM INCREASE: If 2+ suggestions applied, increase by at least 1
    if (appliedSuggestions.length >= 2) {
      const minimumIncrease = 1;
      suggestionImprovement = Math.max(minimumIncrease, suggestionImprovement);
      
      console.log('📈 MIXED CHANGES - ENFORCING MINIMUM SCORE INCREASE:', {
        appliedSuggestions: appliedSuggestions.length,
        calculatedIncrease: appliedSuggestions.length * 2,
        finalIncrease: suggestionImprovement
      });
    }
    
    // Calculate manual edit changes
    let manualChange = 0;
    for (const change of changes) {
      if (change.quality === 'improved') {
        manualChange += 1;
      } else if (change.quality === 'degraded') {
        manualChange -= 2;
      }
    }
    
    // Apply combined changes
    const totalChange = suggestionImprovement + manualChange;
    const previousOverall = overallScore;
    overallScore = Math.max(0, Math.min(100, overallScore + totalChange));
    
    if (overallScore !== previousOverall) {
      scoreChanges.push({
        category: 'Overall',
        previousScore: previousOverall,
        newScore: overallScore,
        change: overallScore - previousOverall,
        reason: `Mixed changes: ${appliedSuggestions.length} suggestions applied${appliedSuggestions.length >= 2 ? ' (minimum increase enforced)' : ''}, ${manualEdits.length} manual edits`
      });
    }
    
    // Update metrics based on affected regions
    for (const change of changes) {
      for (const metricName of change.affectedMetrics) {
        const metricIndex = metrics.findIndex(m => m.label === metricName);
        if (metricIndex !== -1) {
          const previousValue = metrics[metricIndex].value;
          let changeAmount = 0;
          
          if (change.quality === 'improved') {
            changeAmount = 2;
          } else if (change.quality === 'degraded') {
            changeAmount = -2;
          }
          
          metrics[metricIndex].value = Math.max(0, Math.min(100, previousValue + changeAmount));
          
          scoreChanges.push({
            category: metricName,
            previousScore: previousValue,
            newScore: metrics[metricIndex].value,
            change: changeAmount,
            reason: `Mixed changes affected ${metricName.toLowerCase()}`
          });
        }
      }
    }
    
    // Update sub-grades
    subGrades = this.updateSubGrades(subGrades, changes, 'mixed');
    
    return { overallScore, metrics, subGrades, scoreChanges };
  }

  /**
   * Update sub-grades based on changes
   */
  private static updateSubGrades(
    subGrades: EssaySubGrade[],
    changes: RegionChange[],
    changeType: 'improved' | 'degraded' | 'mixed'
  ): EssaySubGrade[] {
    const gradeOrder = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
    
    return subGrades.map(grade => {
      const currentIndex = gradeOrder.indexOf(grade.grade);
      if (currentIndex === -1) return grade;
      
      let newIndex = currentIndex;
      
      if (changeType === 'improved') {
        // Boost grade by 1-2 levels
        newIndex = Math.min(currentIndex + 1, gradeOrder.length - 1);
      } else if (changeType === 'degraded') {
        // Lower grade by 1-2 levels
        newIndex = Math.max(currentIndex - 1, 0);
      } else if (changeType === 'mixed') {
        // Mixed changes - slight improvement
        newIndex = Math.min(currentIndex + 1, gradeOrder.length - 1);
      }
      
      return {
        ...grade,
        grade: gradeOrder[newIndex]
      };
    });
  }
} 