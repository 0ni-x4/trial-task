import { EssaySuggestion } from '@/lib/services/essay-assist/types';

export interface SuggestionFilteringState {
  appliedSuggestions: string[];
  skippedSuggestions: string[];
  appliedSuggestionContent: Set<string>;
  skippedSuggestionContent: Set<string>;
}

/**
 * Create a content hash for a suggestion to track by content
 */
export const createSuggestionHash = (suggestion: EssaySuggestion): string => {
  const fromText = suggestion.from || '';
  const toText = suggestion.to || '';
  const type = suggestion.type || '';
  return `${fromText}|${toText}|${type}`;
};

/**
 * Check if a suggestion should be filtered out
 */
export const shouldFilterSuggestion = (
  suggestion: EssaySuggestion,
  content: string,
  filteringState: SuggestionFilteringState
): boolean => {
  const { appliedSuggestions, skippedSuggestions, appliedSuggestionContent, skippedSuggestionContent } = filteringState;
  const contentHash = createSuggestionHash(suggestion);
  
  // Skip if suggestion has been applied or skipped (using UUID or content hash)
  if (appliedSuggestions.includes(suggestion.uuid) || 
      skippedSuggestions.includes(suggestion.uuid) ||
      appliedSuggestionContent.has(contentHash) ||
      skippedSuggestionContent.has(contentHash)) {
    return true;
  }
  
  // Skip if the "from" text no longer exists in the current content (user already fixed it manually)
  if (suggestion.from && !content.includes(suggestion.from)) {
    return true;
  }
  
  return false;
};

/**
 * Filter suggestions based on applied/skipped state and content existence
 */
export const filterSuggestions = (
  suggestions: EssaySuggestion[],
  content: string,
  filteringState: SuggestionFilteringState
): EssaySuggestion[] => {
  if (!suggestions || !content) return [];
  
  console.log('🔍 Filtering suggestions:', {
    totalSuggestions: suggestions.length,
    appliedSuggestions: filteringState.appliedSuggestions.length,
    skippedSuggestions: filteringState.skippedSuggestions.length,
    appliedContentHashes: filteringState.appliedSuggestionContent.size,
    skippedContentHashes: filteringState.skippedSuggestionContent.size,
    contentLength: content.length
  });
  
  return suggestions.filter((suggestion, index) => {
    const shouldFilter = shouldFilterSuggestion(suggestion, content, filteringState);
    
    if (shouldFilter) {
      const contentHash = createSuggestionHash(suggestion);
      console.log('🔍 Hiding suggestion:', suggestion.uuid, contentHash);
      return false;
    }
    
    console.log(`🔍 Showing suggestion ${index}:`, suggestion.from);
    return true;
  });
};

/**
 * Update filtering state when a suggestion is applied
 */
export const updateFilteringStateOnApply = (
  suggestion: EssaySuggestion,
  currentState: SuggestionFilteringState
): SuggestionFilteringState => {
  const contentHash = createSuggestionHash(suggestion);
  
  return {
    ...currentState,
    appliedSuggestions: [...currentState.appliedSuggestions, suggestion.uuid],
    appliedSuggestionContent: new Set([...Array.from(currentState.appliedSuggestionContent), contentHash])
  };
};

/**
 * Update filtering state when a suggestion is skipped
 */
export const updateFilteringStateOnSkip = (
  suggestion: EssaySuggestion,
  currentState: SuggestionFilteringState
): SuggestionFilteringState => {
  const contentHash = createSuggestionHash(suggestion);
  
  return {
    ...currentState,
    skippedSuggestions: [...currentState.skippedSuggestions, suggestion.uuid],
    skippedSuggestionContent: new Set([...Array.from(currentState.skippedSuggestionContent), contentHash])
  };
}; 