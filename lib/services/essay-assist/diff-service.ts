import { AppliedSuggestion, ManualEdit, DiffResult, EssayVersion } from './types';

export class DiffService {
  /**
   * Calculate similarity between two texts (0-1 scale)
   */
  static calculateSimilarity(text1: string, text2: string): number {
    const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();
    const normalized1 = normalize(text1);
    const normalized2 = normalize(text2);
    
    if (normalized1 === normalized2) return 1.0;
    
    const maxLength = Math.max(normalized1.length, normalized2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = this.levenshteinDistance(normalized1, normalized2);
    return 1 - (distance / maxLength);
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Detect changes between two essay versions
   */
  static detectChanges(
    oldVersion: EssayVersion,
    newContent: string,
    appliedSuggestions: AppliedSuggestion[] = []
  ): DiffResult {
    const oldContent = oldVersion.content;
    
    // Quick check for no changes
    if (oldContent.trim() === newContent.trim()) {
      return {
        appliedSuggestions: [],
        manualEdits: [],
        changeType: 'none',
        significantChange: false
      };
    }

    // Detect applied suggestions
    const detectedAppliedSuggestions = this.detectAppliedSuggestions(
      oldContent,
      newContent,
      appliedSuggestions
    );

    // Detect manual edits (changes not from suggestions)
    const detectedManualEdits = this.detectManualEdits(
      oldContent,
      newContent,
      detectedAppliedSuggestions
    );

    // Determine change type
    const changeType = this.determineChangeType(
      detectedAppliedSuggestions,
      detectedManualEdits
    );

    // Check if change is significant
    const significantChange = this.isSignificantChange(
      oldContent,
      newContent,
      detectedManualEdits
    );

    return {
      appliedSuggestions: detectedAppliedSuggestions,
      manualEdits: detectedManualEdits,
      changeType,
      significantChange
    };
  }

  /**
   * Detect applied suggestions by comparing content changes
   */
  private static detectAppliedSuggestions(
    oldContent: string,
    newContent: string,
    knownSuggestions: AppliedSuggestion[]
  ): AppliedSuggestion[] {
    const detected: AppliedSuggestion[] = [];
    
    // If we have known suggestions from the frontend, trust them
    if (knownSuggestions.length > 0) {
      console.log('📊 Using frontend-provided applied suggestions:', knownSuggestions.length);
      return knownSuggestions.map(suggestion => ({
        ...suggestion,
        appliedAt: new Date(suggestion.appliedAt || Date.now())
      }));
    }
    
    // Fallback: try to detect applied suggestions by comparing content
    for (const suggestion of knownSuggestions) {
      // Check if the suggestion was actually applied
      const oldIndex = oldContent.indexOf(suggestion.originalText);
      const newIndex = newContent.indexOf(suggestion.newText);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        // Verify the context around the change
        const contextBefore = oldContent.substring(Math.max(0, oldIndex - 20), oldIndex);
        const contextAfter = oldContent.substring(oldIndex + suggestion.originalText.length, oldIndex + suggestion.originalText.length + 20);
        
        const newContextBefore = newContent.substring(Math.max(0, newIndex - 20), newIndex);
        const newContextAfter = newContent.substring(newIndex + suggestion.newText.length, newIndex + suggestion.newText.length + 20);
        
        if (contextBefore === newContextBefore && contextAfter === newContextAfter) {
          detected.push({
            ...suggestion,
            startIndex: oldIndex,
            endIndex: oldIndex + suggestion.originalText.length,
            appliedAt: new Date()
          });
        }
      }
    }
    
    return detected;
  }

  /**
   * Detect manual edits (changes not from suggestions)
   */
  private static detectManualEdits(
    oldContent: string,
    newContent: string,
    appliedSuggestions: AppliedSuggestion[]
  ): ManualEdit[] {
    const manualEdits: ManualEdit[] = [];
    
    // Create a version of the old content with suggestions applied
    let contentWithSuggestions = oldContent;
    
    // Apply suggestions to create expected content
    for (const suggestion of appliedSuggestions.sort((a, b) => b.startIndex - a.startIndex)) {
      contentWithSuggestions = 
        contentWithSuggestions.slice(0, suggestion.startIndex) +
        suggestion.newText +
        contentWithSuggestions.slice(suggestion.endIndex);
    }
    
    // Only detect manual edits if there's a significant difference
    if (contentWithSuggestions !== newContent) {
      // Simple length-based detection - only detect if content changed significantly
      const lengthDiff = Math.abs(newContent.length - contentWithSuggestions.length);
      const similarity = this.calculateSimilarity(contentWithSuggestions, newContent);
      
      // Only detect manual edits if there's a meaningful change (similarity < 0.95 and length diff > 10)
      if (similarity < 0.95 && lengthDiff > 10) {
        // Create a single manual edit representing the overall change
        manualEdits.push({
          startIndex: 0,
          endIndex: contentWithSuggestions.length,
          oldText: contentWithSuggestions,
          newText: newContent,
          editedAt: new Date(),
          quality: similarity > 0.8 ? 'improved' : 'neutral'
        });
      }
    }
    
    return manualEdits;
  }

  /**
   * Assess the quality of an edit (improved, worsened, neutral)
   */
  private static assessEditQuality(oldText: string, newText: string): 'improved' | 'worsened' | 'neutral' {
    // Simple heuristics for quality assessment
    if (!oldText && newText) return 'improved'; // Addition
    if (oldText && !newText) return 'neutral'; // Removal
    if (oldText === newText) return 'neutral'; // No change
    
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
    if (newText.length > oldText.length * 1.2) return 'improved';
    if (newText.length < oldText.length * 0.8) return 'worsened';
    
    return 'neutral';
  }

  /**
   * Determine the type of change based on detected changes
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
   * Check if a change is significant enough to warrant re-evaluation
   */
  private static isSignificantChange(
    oldContent: string,
    newContent: string,
    manualEdits: ManualEdit[]
  ): boolean {
    // Check content length change
    const lengthChangeRatio = Math.abs(newContent.length - oldContent.length) / oldContent.length;
    if (lengthChangeRatio > 0.05) return true; // 5% change in length
    
    // Check number of manual edits
    if (manualEdits.length > 3) return true;
    
    // Check if any manual edit is substantial
    const hasSubstantialEdit = manualEdits.some(edit => 
      edit.oldText.length > 20 || edit.newText.length > 20
    );
    
    return hasSubstantialEdit;
  }
} 