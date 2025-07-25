import { v4 as uuidv4 } from 'uuid';

export interface EssayVersion {
  id: string;
  content: string;
  timestamp: Date;
  wordCount: number;
  changeType: 'initial' | 'manual_edit' | 'suggestion_applied' | 'bulk_suggestion_applied';
  appliedSuggestionIds?: string[];
  parentVersionId?: string;
}

export interface TextChange {
  startIndex: number;
  endIndex: number;
  oldText: string;
  newText: string;
  changeType: 'addition' | 'deletion' | 'modification';
  region: 'beginning' | 'middle' | 'end';
}

export interface DiffResult {
  changes: TextChange[];
  changeType: 'no_change' | 'manual_edit' | 'suggestion_applied' | 'bulk_suggestion_applied';
  appliedSuggestionIds: string[];
  affectedRegions: string[];
}

export interface AppliedSuggestion {
  id: string;
  originalText: string;
  replacementText: string;
  startIndex: number;
  endIndex: number;
  appliedAt: Date;
  category: string;
}

export class EssayDiffSystem {
  private versions: Map<string, EssayVersion> = new Map();
  private appliedSuggestions: Map<string, AppliedSuggestion> = new Map();

  constructor() {}

  // Create initial version
  createInitialVersion(content: string): EssayVersion {
    const version: EssayVersion = {
      id: uuidv4(),
      content,
      timestamp: new Date(),
      wordCount: this.getWordCount(content),
      changeType: 'initial'
    };
    
    this.versions.set(version.id, version);
    return version;
  }

  // Add new version with diff analysis
  addVersion(
    content: string, 
    previousVersionId: string,
    appliedSuggestionIds: string[] = []
  ): { version: EssayVersion; diff: DiffResult } {
    const previousVersion = this.versions.get(previousVersionId);
    if (!previousVersion) {
      throw new Error('Previous version not found');
    }

    const diff = this.computeDiff(previousVersion.content, content, appliedSuggestionIds);
    
    const version: EssayVersion = {
      id: uuidv4(),
      content,
      timestamp: new Date(),
      wordCount: this.getWordCount(content),
      changeType: this.determineChangeType(diff),
      appliedSuggestionIds: appliedSuggestionIds.length > 0 ? appliedSuggestionIds : undefined,
      parentVersionId: previousVersionId
    };

    this.versions.set(version.id, version);
    return { version, diff };
  }

  // Compute diff between two versions
  private computeDiff(oldContent: string, newContent: string, appliedSuggestionIds: string[]): DiffResult {
    if (oldContent === newContent) {
      return {
        changes: [],
        changeType: 'no_change',
        appliedSuggestionIds: [],
        affectedRegions: []
      };
    }

    // If suggestions were applied, this is likely a suggestion application
    if (appliedSuggestionIds.length > 0) {
      return {
        changes: this.findTextChanges(oldContent, newContent),
        changeType: appliedSuggestionIds.length > 3 ? 'bulk_suggestion_applied' : 'suggestion_applied',
        appliedSuggestionIds,
        affectedRegions: this.identifyAffectedRegions(oldContent, newContent)
      };
    }

    // Otherwise, it's a manual edit
    const changes = this.findTextChanges(oldContent, newContent);
    return {
      changes,
      changeType: 'manual_edit',
      appliedSuggestionIds: [],
      affectedRegions: this.identifyAffectedRegions(oldContent, newContent)
    };
  }

  // Find specific text changes using a simple diff algorithm
  private findTextChanges(oldText: string, newText: string): TextChange[] {
    const changes: TextChange[] = [];
    
    // Simple LCS-based diff algorithm
    const oldWords = oldText.split(/(\s+)/);
    const newWords = newText.split(/(\s+)/);
    
    let oldIndex = 0;
    let newIndex = 0;
    let charOffset = 0;
    
    while (oldIndex < oldWords.length || newIndex < newWords.length) {
      if (oldIndex >= oldWords.length) {
        // Addition at end
        const addedText = newWords.slice(newIndex).join('');
        changes.push({
          startIndex: charOffset,
          endIndex: charOffset,
          oldText: '',
          newText: addedText,
          changeType: 'addition',
          region: this.getRegion(charOffset, oldText.length)
        });
        break;
      }
      
      if (newIndex >= newWords.length) {
        // Deletion at end
        const deletedText = oldWords.slice(oldIndex).join('');
        changes.push({
          startIndex: charOffset,
          endIndex: charOffset + deletedText.length,
          oldText: deletedText,
          newText: '',
          changeType: 'deletion',  
          region: this.getRegion(charOffset, oldText.length)
        });
        break;
      }
      
      if (oldWords[oldIndex] === newWords[newIndex]) {
        // Match - move forward
        charOffset += oldWords[oldIndex].length;
        oldIndex++;
        newIndex++;
      } else {
        // Find the next matching point
        let matchFound = false;
        const maxLookAhead = 10;
        
        for (let i = 1; i <= maxLookAhead && i + oldIndex < oldWords.length; i++) {
          for (let j = 1; j <= maxLookAhead && j + newIndex < newWords.length; j++) {
            if (oldWords[oldIndex + i] === newWords[newIndex + j]) {
              // Found match - record the change
              const oldChange = oldWords.slice(oldIndex, oldIndex + i).join('');
              const newChange = newWords.slice(newIndex, newIndex + j).join('');
              
              changes.push({
                startIndex: charOffset,
                endIndex: charOffset + oldChange.length,
                oldText: oldChange,
                newText: newChange,
                changeType: 'modification',
                region: this.getRegion(charOffset, oldText.length)
              });
              
              charOffset += newChange.length;
              oldIndex += i;
              newIndex += j;
              matchFound = true;
              break;
            }
          }
          if (matchFound) break;
        }
        
        if (!matchFound) {
          // No match found in lookahead - treat as simple substitution
          const oldChange = oldWords[oldIndex];
          const newChange = newWords[newIndex];
          
          changes.push({
            startIndex: charOffset,
            endIndex: charOffset + oldChange.length,
            oldText: oldChange,
            newText: newChange,
            changeType: 'modification',
            region: this.getRegion(charOffset, oldText.length)
          });
          
          charOffset += newChange.length;
          oldIndex++;
          newIndex++;
        }
      }
    }
    
    return changes;
  }

  // Identify which regions of the essay were affected
  private identifyAffectedRegions(oldContent: string, newContent: string): string[] {
    const changes = this.findTextChanges(oldContent, newContent);
    const regions = new Set<string>();
    
    changes.forEach(change => {
      regions.add(change.region);
    });
    
    return Array.from(regions);
  }

  // Determine which region of the essay a change occurred in
  private getRegion(charIndex: number, totalLength: number): 'beginning' | 'middle' | 'end' {
    const ratio = charIndex / totalLength;
    if (ratio < 0.33) return 'beginning';
    if (ratio < 0.67) return 'middle';
    return 'end';
  }

  // Determine the type of change based on diff analysis
  private determineChangeType(diff: DiffResult): EssayVersion['changeType'] {
    if (diff.changeType === 'no_change') return 'manual_edit'; // Shouldn't happen
    if (diff.appliedSuggestionIds.length > 3) return 'bulk_suggestion_applied';
    if (diff.appliedSuggestionIds.length > 0) return 'suggestion_applied';
    return 'manual_edit';
  }

  // Track applied suggestions
  recordAppliedSuggestion(suggestion: AppliedSuggestion): void {
    this.appliedSuggestions.set(suggestion.id, suggestion);
  }

  // Get applied suggestions for a specific time range
  getAppliedSuggestions(since?: Date): AppliedSuggestion[] {
    const suggestions = Array.from(this.appliedSuggestions.values());
    if (!since) return suggestions;
    
    return suggestions.filter(s => s.appliedAt >= since);
  }

  // Get version history
  getVersionHistory(): EssayVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => 
      a.timestamp.getTime() - b.timestamp.getTime()
    );
  }

  // Get latest version
  getLatestVersion(): EssayVersion | null {
    const versions = this.getVersionHistory();
    return versions.length > 0 ? versions[versions.length - 1] : null;
  }

  // Get version by ID
  getVersion(id: string): EssayVersion | null {
    return this.versions.get(id) || null;
  }

  // Get word count
  private getWordCount(content: string): number {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }

  // Serialize state for persistence
  serialize(): string {
    return JSON.stringify({
      versions: Array.from(this.versions.entries()),
      appliedSuggestions: Array.from(this.appliedSuggestions.entries())
    });
  }

  // Deserialize state from persistence
  static deserialize(data: string): EssayDiffSystem {
    const system = new EssayDiffSystem();
    const parsed = JSON.parse(data);
    
    system.versions = new Map(parsed.versions.map(([id, version]: [string, any]) => [
      id, 
      { ...version, timestamp: new Date(version.timestamp) }
    ]));
    
    system.appliedSuggestions = new Map(parsed.appliedSuggestions.map(([id, suggestion]: [string, any]) => [
      id,
      { ...suggestion, appliedAt: new Date(suggestion.appliedAt) }
    ]));
    
    return system;
  }
}