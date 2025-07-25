import { v4 as uuidv4 } from 'uuid';
import { DiffResult, TextChange } from './essay-diff-system';
import { SuggestionImpact } from './progressive-scoring-system';

export interface Suggestion {
  uuid: string;
  category: 'Grammar' | 'Spelling' | 'Word choice' | 'Tone & voice' | 'Idea strength' | 'Rephrase' | 'Structure' | 'Clarity';
  title: string;
  description: string;
  startIndex: number;
  endIndex: number;
  replacement: string;
  originalText: string;
  region: 'beginning' | 'middle' | 'end';
  priority: 'high' | 'medium' | 'low';
  impact?: SuggestionImpact;
}

export interface SuggestionGenerationRequest {
  content: string;
  prompt?: string;
  diff?: DiffResult;
  previousSuggestions?: Suggestion[];
  appliedSuggestionIds?: string[];
  isFirstReview: boolean;
}

export interface SuggestionGenerationResult {
  suggestions: Suggestion[];
  focusedRegions: string[];
  suggestionCount: number;
  generationType: 'full' | 'targeted' | 'score_update_only';
}

export class SmartSuggestionGenerator {
  private appliedSuggestions: Set<string> = new Set();
  private skippedSuggestions: Set<string> = new Set();

  constructor() {}

  // Main entry point for suggestion generation
  async generateSuggestions(request: SuggestionGenerationRequest): Promise<SuggestionGenerationResult> {
    const { content, diff, isFirstReview, appliedSuggestionIds = [] } = request;

    // Track applied suggestions
    appliedSuggestionIds.forEach(id => this.appliedSuggestions.add(id));

    // Determine generation strategy
    if (isFirstReview) {
      return this.generateFullReviewSuggestions(request);
    }

    if (!diff || diff.changeType === 'no_change') {
      return {
        suggestions: [],
        focusedRegions: [],
        suggestionCount: 0,
        generationType: 'score_update_only'
      };
    }

    if (diff.changeType === 'suggestion_applied' || diff.changeType === 'bulk_suggestion_applied') {
      // Don't generate new suggestions when suggestions are applied
      // The scoring system will handle score updates
      return {
        suggestions: this.filterOutAppliedSuggestions(request.previousSuggestions || []),
        focusedRegions: [],
        suggestionCount: 0,
        generationType: 'score_update_only'
      };
    }

    if (diff.changeType === 'manual_edit') {
      return this.generateTargetedSuggestions(request);
    }

    // Fallback to full review
    return this.generateFullReviewSuggestions(request);
  }

  // Generate suggestions for first review (20-50 suggestions)
  private async generateFullReviewSuggestions(request: SuggestionGenerationRequest): Promise<SuggestionGenerationResult> {
    const suggestionCount = 20 + Math.floor(Math.random() * 30); // 20-50 suggestions
    const suggestions = await this.callAIForSuggestions(request.content, request.prompt, suggestionCount, 'full');
    
    return {
      suggestions: this.prioritizeAndOrderSuggestions(suggestions),
      focusedRegions: ['beginning', 'middle', 'end'],
      suggestionCount: suggestions.length,
      generationType: 'full'
    };
  }

  // Generate targeted suggestions for edited regions (1-10 suggestions)
  private async generateTargetedSuggestions(request: SuggestionGenerationRequest): Promise<SuggestionGenerationResult> {
    const { content, diff, prompt } = request;
    
    if (!diff || diff.changes.length === 0) {
      return {
        suggestions: [],
        focusedRegions: [],
        suggestionCount: 0,
        generationType: 'targeted'
      };
    }

    const maxSuggestions = Math.min(10, diff.changes.length * 3); // Max 10, but scale with changes
    const focusedRegions = diff.affectedRegions;
    
    // Generate context for AI about what changed
    const changeContext = this.buildChangeContext(diff.changes, content);
    
    const suggestions = await this.callAIForTargetedSuggestions(
      content, 
      prompt, 
      changeContext, 
      maxSuggestions,
      focusedRegions
    );

    return {
      suggestions: this.prioritizeAndOrderSuggestions(suggestions),
      focusedRegions,
      suggestionCount: suggestions.length,
      generationType: 'targeted'
    };
  }

  // Build context about what changed for the AI
  private buildChangeContext(changes: TextChange[], content: string): string {
    const contextParts = changes.map(change => {
      const surrounding = this.getSurroundingContext(content, change.startIndex, change.endIndex);
      return `Changed in ${change.region} section: "${change.oldText}" → "${change.newText}"\nContext: ...${surrounding}...`;
    });

    return contextParts.join('\n\n');
  }

  // Get surrounding context for a change
  private getSurroundingContext(content: string, startIndex: number, endIndex: number, contextLength: number = 100): string {
    const start = Math.max(0, startIndex - contextLength);
    const end = Math.min(content.length, endIndex + contextLength);
    return content.slice(start, end);
  }

  // Call AI for full review suggestions
  private async callAIForSuggestions(
    content: string, 
    prompt: string = '', 
    suggestionCount: number,
    type: 'full' | 'targeted'
  ): Promise<Suggestion[]> {
    const { openai } = await import('@/lib/openai');
    
    const systemPrompt = `You are a Harvard admissions officer reviewing a college application essay. 
    
Generate ${suggestionCount} specific, actionable suggestions for improvement. Focus on:
- Grammar and spelling errors
- Word choice improvements
- Tone and voice enhancements
- Clarity improvements
- Structural suggestions
- Content strengthening

Return JSON in this exact format:
{
  "suggestions": [
    {
      "uuid": "unique-id",
      "category": "Grammar",
      "title": "Fix subject-verb agreement",
      "description": "Change 'The students is' to 'The students are' for correct grammar",
      "startIndex": 45,
      "endIndex": 60,
      "replacement": "The students are",
      "originalText": "The students is",
      "priority": "high"
    }
  ]
}

Order suggestions by position in essay (beginning to end). Each suggestion must have valid startIndex/endIndex and exact text matches.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Essay: ${content}\n\nPrompt: ${prompt}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 4000,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"suggestions": []}');
      
      return result.suggestions.map((suggestion: any) => ({
        ...suggestion,
        uuid: suggestion.uuid || uuidv4(),
        region: this.getRegionForIndex(suggestion.startIndex || 0, content.length),
        impact: this.generateSuggestionImpact({
          ...suggestion,
          region: this.getRegionForIndex(suggestion.startIndex || 0, content.length)
        } as Suggestion)
      }));
    } catch (error) {
      console.error('❌ AI suggestion generation failed:', error);
      return [];
    }
  }

  // Call AI for targeted suggestions in specific regions
  private async callAIForTargetedSuggestions(
    content: string,
    prompt: string = '',
    changeContext: string,
    maxSuggestions: number,
    focusedRegions: string[]
  ): Promise<Suggestion[]> {
    const { openai } = await import('@/lib/openai');
    
    const systemPrompt = `You are a Harvard admissions officer. The user made manual edits to their essay. 
    
Focus ONLY on the edited sections and generate ${maxSuggestions} targeted suggestions for improvement.

Recently edited sections:
${changeContext}

Focused regions: ${focusedRegions.join(', ')}

Return JSON with suggestions specifically for the edited areas:
{
  "suggestions": [
    {
      "uuid": "unique-id",
      "category": "Grammar",
      "title": "Improve clarity in edited section",
      "description": "Make this sentence more concise based on your recent edit",
      "startIndex": 45,
      "endIndex": 60,
      "replacement": "Improved text",
      "originalText": "Original text",
      "priority": "high"
    }
  ]
}

Focus suggestions on areas that were recently changed. Each suggestion must have valid startIndex/endIndex and exact text matches.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Essay: ${content}\n\nPrompt: ${prompt}` }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
        max_tokens: 2000,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{"suggestions": []}');
      
      return result.suggestions.map((suggestion: any) => ({
        ...suggestion,
        uuid: suggestion.uuid || uuidv4(),
        region: this.getRegionForIndex(suggestion.startIndex || 0, content.length),
        priority: 'high', // Targeted suggestions are high priority
        impact: this.generateSuggestionImpact({
          ...suggestion,
          region: this.getRegionForIndex(suggestion.startIndex || 0, content.length)
        } as Suggestion)
      }));
    } catch (error) {
      console.error('❌ AI targeted suggestion generation failed:', error);
      return [];
    }
  }

  // Generate suggestion impact for scoring system
  private generateSuggestionImpact(suggestion: Suggestion): SuggestionImpact {
    const affectedMetrics: string[] = [];
    const affectedSubGrades: string[] = [];
    let scoreBoost = 1;

    // Map categories to affected metrics and sub-grades
    switch (suggestion.category) {
      case 'Grammar':
      case 'Spelling':
        affectedMetrics.push('Clarity');
        scoreBoost = 1;
        break;
      case 'Word choice':
      case 'Clarity':
        affectedMetrics.push('Clarity', 'Quality');
        scoreBoost = 2;
        break;
      case 'Tone & voice':
      case 'Idea strength':
        affectedMetrics.push('Delivery', 'Quality');
        affectedSubGrades.push('Uniqueness');
        scoreBoost = 3;
        break;
      case 'Structure':
        affectedMetrics.push('Delivery');
        affectedSubGrades.push('Structure');
        scoreBoost = 2;
        break;
      case 'Rephrase':
        affectedMetrics.push('Quality');
        scoreBoost = 2;
        break;
    }

    // Region-specific impacts
    if (suggestion.region === 'beginning') {
      affectedSubGrades.push('Hook');
    }

    return {
      suggestionId: suggestion.uuid,
      category: suggestion.category,
      region: suggestion.region,
      affectedMetrics,
      affectedSubGrades,
      scoreBoost: Math.min(3, scoreBoost) // Cap at 3
    };
  }

  // Prioritize and order suggestions
  private prioritizeAndOrderSuggestions(suggestions: Suggestion[]): Suggestion[] {
    // Sort by position in essay (first sections first), then by priority
    return suggestions.sort((a, b) => {
      const regionOrder = { 'beginning': 0, 'middle': 1, 'end': 2 };
      const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
      
      const regionDiff = regionOrder[a.region] - regionOrder[b.region];
      if (regionDiff !== 0) return regionDiff;
      
      const positionDiff = a.startIndex - b.startIndex;
      if (positionDiff !== 0) return positionDiff;
      
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  // Filter out applied suggestions from the list
  private filterOutAppliedSuggestions(suggestions: Suggestion[]): Suggestion[] {
    return suggestions.filter(suggestion => !this.appliedSuggestions.has(suggestion.uuid));
  }

  // Get region for index
  private getRegionForIndex(index: number, totalLength: number): 'beginning' | 'middle' | 'end' {
    const ratio = index / totalLength;
    if (ratio < 0.33) return 'beginning';
    if (ratio < 0.67) return 'middle';
    return 'end';
  }

  // Get random index for specific region
  private getRandomIndexForRegion(region: 'beginning' | 'middle' | 'end', totalLength: number): number {
    switch (region) {
      case 'beginning':
        return Math.floor(Math.random() * (totalLength * 0.33));
      case 'middle':
        return Math.floor(totalLength * 0.33 + Math.random() * (totalLength * 0.34));
      case 'end':
        return Math.floor(totalLength * 0.67 + Math.random() * (totalLength * 0.33));
    }
  }

  // Track applied suggestion
  markSuggestionApplied(suggestionId: string): void {
    this.appliedSuggestions.add(suggestionId);
  }

  // Track skipped suggestion
  markSuggestionSkipped(suggestionId: string): void {
    this.skippedSuggestions.add(suggestionId);
  }

  // Get applied suggestions
  getAppliedSuggestions(): Set<string> {
    return new Set(this.appliedSuggestions);
  }

  // Get skipped suggestions
  getSkippedSuggestions(): Set<string> {
    return new Set(this.skippedSuggestions);
  }

  // Reset state
  reset(): void {
    this.appliedSuggestions.clear();
    this.skippedSuggestions.clear();
  }
}