import { EssayVersion, AppliedSuggestion, ManualEdit } from './types';

export interface VersionDiff {
  type: 'suggestion_applied' | 'manual_edit' | 'mixed' | 'none';
  changes: RegionChange[];
  appliedSuggestions: AppliedSuggestion[];
  manualEdits: ManualEdit[];
  significantChange: boolean;
}

export interface RegionChange {
  startIndex: number;
  endIndex: number;
  oldText: string;
  newText: string;
  changeType: 'addition' | 'deletion' | 'modification';
  quality: 'improved' | 'degraded' | 'neutral';
  affectedMetrics: string[];
}

export class VersionTracker {
  /**
   * Track a new version of the essay
   */
  static createVersion(
    content: string,
    version: number,
    appliedSuggestions: AppliedSuggestion[] = [],
    manualEdits: ManualEdit[] = []
  ): EssayVersion {
    return {
      content,
      timestamp: new Date(),
      version,
      wordCount: content.trim().split(/\s+/).length,
      appliedSuggestions,
      manualEdits
    };
  }

  /**
   * Detect meaningful changes between two versions
   */
  static detectChanges(
    oldVersion: EssayVersion,
    newContent: string
  ): VersionDiff {
    const oldContent = oldVersion.content;
    
    // Quick check for no changes
    if (oldContent.trim() === newContent.trim()) {
      return {
        type: 'none',
        changes: [],
        appliedSuggestions: [],
        manualEdits: [],
        significantChange: false
      };
    }

    // Detect region-level changes
    const changes = this.detectRegionChanges(oldContent, newContent);
    
    // Categorize changes
    const appliedSuggestions = this.detectAppliedSuggestions(oldVersion, changes);
    const manualEdits = this.detectManualEdits(oldVersion, changes, appliedSuggestions);
    
    // Determine change type
    const changeType = this.determineChangeType(appliedSuggestions, manualEdits);
    
    // Check if change is significant
    const significantChange = this.isSignificantChange(changes, manualEdits);

    return {
      type: changeType,
      changes,
      appliedSuggestions,
      manualEdits,
      significantChange
    };
  }

  /**
   * Detect changes at the region level (paragraphs, sentences)
   */
  private static detectRegionChanges(oldContent: string, newContent: string): RegionChange[] {
    const changes: RegionChange[] = [];
    
    // Split into paragraphs for region-level analysis
    const oldParagraphs = oldContent.split(/\n\s*\n/);
    const newParagraphs = newContent.split(/\n\s*\n/);
    
    let oldPos = 0;
    let newPos = 0;
    let oldIndex = 0;
    let newIndex = 0;
    
    while (oldIndex < oldParagraphs.length || newIndex < newParagraphs.length) {
      const oldParagraph = oldParagraphs[oldIndex] || '';
      const newParagraph = newParagraphs[newIndex] || '';
      
      // Normalize for comparison
      const oldNormalized = oldParagraph.trim().replace(/\s+/g, ' ');
      const newNormalized = newParagraph.trim().replace(/\s+/g, ' ');
      
      // Calculate similarity
      const similarity = this.calculateSimilarity(oldNormalized, newNormalized);
      
      if (similarity > 0.9) {
        // Paragraphs are very similar, consider unchanged
        oldPos += oldParagraph.length + 2;
        newPos += newParagraph.length + 2;
        oldIndex++;
        newIndex++;
      } else {
        // Paragraphs differ significantly
        const change = this.analyzeRegionChange(
          oldParagraph, newParagraph, oldPos, newPos
        );
        
        if (change) {
          changes.push(change);
        }
        
        oldPos += oldParagraph.length + 2;
        newPos += newParagraph.length + 2;
        oldIndex++;
        newIndex++;
      }
    }
    
    return changes;
  }

  /**
   * Analyze a specific region change
   */
  private static analyzeRegionChange(
    oldText: string,
    newText: string,
    oldStartPos: number,
    newStartPos: number
  ): RegionChange | null {
    const oldTrimmed = oldText.trim();
    const newTrimmed = newText.trim();
    
    if (oldTrimmed === newTrimmed) return null;
    
    // Determine change type
    let changeType: 'addition' | 'deletion' | 'modification';
    if (!oldTrimmed && newTrimmed) {
      changeType = 'addition';
    } else if (oldTrimmed && !newTrimmed) {
      changeType = 'deletion';
    } else {
      changeType = 'modification';
    }
    
    // Assess quality change
    const quality = this.assessQualityChange(oldTrimmed, newTrimmed);
    
    // Determine affected metrics
    const affectedMetrics = this.determineAffectedMetrics(oldTrimmed, newTrimmed);
    
    return {
      startIndex: newStartPos,
      endIndex: newStartPos + newText.length,
      oldText: oldTrimmed,
      newText: newTrimmed,
      changeType,
      quality,
      affectedMetrics
    };
  }

  /**
   * Assess if a change improves or degrades quality
   */
  private static assessQualityChange(oldText: string, newText: string): 'improved' | 'degraded' | 'neutral' {
    if (!oldText && newText) return 'improved'; // Addition
    if (oldText && !newText) return 'neutral'; // Deletion
    
    // Simple heuristics for quality assessment
    const oldWords = oldText.split(/\s+/).length;
    const newWords = newText.split(/\s+/).length;
    
    // Check for common improvements
    const improvements = [
      { from: /\b(good|nice|great)\b/gi, to: /\b(excellent|outstanding|remarkable)\b/gi },
      { from: /\b(bad|poor)\b/gi, to: /\b(inadequate|insufficient)\b/gi },
      { from: /\b(very)\b/gi, to: /\b(extremely|exceptionally)\b/gi }
    ];
    
    for (const improvement of improvements) {
      if (improvement.from.test(oldText) && improvement.to.test(newText)) {
        return 'improved';
      }
    }
    
    // Check for length and complexity improvements
    if (newWords > oldWords * 1.2) return 'improved';
    if (newWords < oldWords * 0.8) return 'degraded';
    
    return 'neutral';
  }

  /**
   * Determine which metrics are affected by a change
   */
  private static determineAffectedMetrics(oldText: string, newText: string): string[] {
    const metrics: string[] = [];
    
    // Check for spelling/grammar changes
    if (this.hasSpellingGrammarChanges(oldText, newText)) {
      metrics.push('Clarity', 'Delivery');
    }
    
    // Check for structural changes
    if (this.hasStructuralChanges(oldText, newText)) {
      metrics.push('Structure', 'Quality');
    }
    
    // Check for tone changes
    if (this.hasToneChanges(oldText, newText)) {
      metrics.push('Tone', 'Voice');
    }
    
    return metrics;
  }

  private static hasSpellingGrammarChanges(oldText: string, newText: string): boolean {
    // Simple check for spelling/grammar improvements
    const spellingPatterns = [
      /\b(prosented|findinergs|regeniol|recogeeition)\b/gi
    ];
    
    for (const pattern of spellingPatterns) {
      if (pattern.test(oldText) && !pattern.test(newText)) {
        return true;
      }
    }
    
    return false;
  }

  private static hasStructuralChanges(oldText: string, newText: string): boolean {
    // Check for paragraph structure changes
    const oldParagraphs = oldText.split(/\n\s*\n/).length;
    const newParagraphs = newText.split(/\n\s*\n/).length;
    
    return oldParagraphs !== newParagraphs;
  }

  private static hasToneChanges(oldText: string, newText: string): boolean {
    // Check for tone indicators
    const formalTone = /\b(clearly|evidently|consequently|furthermore)\b/gi;
    const informalTone = /\b(like|you know|sort of|kind of)\b/gi;
    
    const oldFormal = (oldText.match(formalTone) || []).length;
    const newFormal = (newText.match(formalTone) || []).length;
    const oldInformal = (oldText.match(informalTone) || []).length;
    const newInformal = (newText.match(informalTone) || []).length;
    
    return oldFormal !== newFormal || oldInformal !== newInformal;
  }

  /**
   * Detect applied suggestions by comparing changes
   */
  private static detectAppliedSuggestions(
    oldVersion: EssayVersion,
    changes: RegionChange[]
  ): AppliedSuggestion[] {
    const appliedSuggestions: AppliedSuggestion[] = [];
    
    // Use known applied suggestions from the version
    for (const suggestion of oldVersion.appliedSuggestions) {
      // Check if this suggestion was actually applied in the changes
      const wasApplied = changes.some(change => 
        change.oldText.includes(suggestion.originalText) &&
        change.newText.includes(suggestion.newText)
      );
      
      if (wasApplied) {
        appliedSuggestions.push(suggestion);
      }
    }
    
    return appliedSuggestions;
  }

  /**
   * Detect manual edits (changes not from suggestions)
   */
  private static detectManualEdits(
    oldVersion: EssayVersion,
    changes: RegionChange[],
    appliedSuggestions: AppliedSuggestion[]
  ): ManualEdit[] {
    const manualEdits: ManualEdit[] = [];
    
    for (const change of changes) {
      // Check if this change matches an applied suggestion
      const isFromSuggestion = appliedSuggestions.some(suggestion =>
        change.oldText.includes(suggestion.originalText) &&
        change.newText.includes(suggestion.newText)
      );
      
      if (!isFromSuggestion) {
        manualEdits.push({
          startIndex: change.startIndex,
          endIndex: change.endIndex,
          oldText: change.oldText,
          newText: change.newText,
          editedAt: new Date(),
          quality: change.quality === 'degraded' ? 'worsened' : change.quality
        });
      }
    }
    
    return manualEdits;
  }

  /**
   * Determine the type of change
   */
  private static determineChangeType(
    appliedSuggestions: AppliedSuggestion[],
    manualEdits: ManualEdit[]
  ): 'suggestion_applied' | 'manual_edit' | 'mixed' | 'none' {
    const hasAppliedSuggestions = appliedSuggestions.length > 0;
    const hasManualEdits = manualEdits.length > 0;
    
    if (!hasAppliedSuggestions && !hasManualEdits) return 'none';
    if (hasAppliedSuggestions && !hasManualEdits) return 'suggestion_applied';
    if (!hasAppliedSuggestions && hasManualEdits) return 'manual_edit';
    return 'mixed';
  }

  /**
   * Check if a change is significant
   */
  private static isSignificantChange(
    changes: RegionChange[],
    manualEdits: ManualEdit[]
  ): boolean {
    // Check content length change
    const totalOldLength = changes.reduce((sum, change) => sum + change.oldText.length, 0);
    const totalNewLength = changes.reduce((sum, change) => sum + change.newText.length, 0);
    const lengthChangeRatio = Math.abs(totalNewLength - totalOldLength) / Math.max(totalOldLength, 1);
    
    if (lengthChangeRatio > 0.1) return true; // 10% change in length
    
    // Check number of manual edits
    if (manualEdits.length > 2) return true;
    
    // Check if any manual edit is substantial
    const hasSubstantialEdit = manualEdits.some(edit => 
      edit.oldText.length > 20 || edit.newText.length > 20
    );
    
    return hasSubstantialEdit;
  }

  /**
   * Calculate similarity between two texts
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length;
    const len2 = str2.length;
    
    if (len1 === 0 && len2 === 0) return 1;
    if (len1 === 0 || len2 === 0) return 0;
    
    const maxLen = Math.max(len1, len2);
    const minLen = Math.min(len1, len2);
    
    let matches = 0;
    for (let i = 0; i < minLen; i++) {
      if (str1[i] === str2[i]) {
        matches++;
      }
    }
    
    return matches / maxLen;
  }
} 