'use client';

import { useState, useMemo, useEffect } from 'react';
import { EssaySuggestion } from '@/lib/services/essay-assist/types';
import { 
  filterSuggestions, 
  updateFilteringStateOnApply, 
  updateFilteringStateOnSkip,
  SuggestionFilteringState 
} from '@/lib/utils/suggestion-filtering';

interface UseSuggestionFilteringParams {
  suggestions: EssaySuggestion[];
  content: string;
  initialAppliedSuggestions?: string[];
  initialSkippedSuggestions?: string[];
}

export function useSuggestionFiltering({ 
  suggestions, 
  content, 
  initialAppliedSuggestions = [], 
  initialSkippedSuggestions = [] 
}: UseSuggestionFilteringParams) {
  // Filtering state
  const [appliedSuggestions, setAppliedSuggestions] = useState<string[]>(initialAppliedSuggestions);
  const [skippedSuggestions, setSkippedSuggestions] = useState<string[]>(initialSkippedSuggestions);
  const [appliedSuggestionContent, setAppliedSuggestionContent] = useState<Set<string>>(new Set());
  const [skippedSuggestionContent, setSkippedSuggestionContent] = useState<Set<string>>(new Set());

  // Initialize from database data
  useEffect(() => {
    if (initialAppliedSuggestions.length > 0) {
      setAppliedSuggestions(initialAppliedSuggestions);
      console.log('🔄 Initialized applied suggestions from database:', initialAppliedSuggestions.length);
    }
    if (initialSkippedSuggestions.length > 0) {
      setSkippedSuggestions(initialSkippedSuggestions);
      console.log('🔄 Initialized skipped suggestions from database:', initialSkippedSuggestions.length);
    }
  }, [initialAppliedSuggestions, initialSkippedSuggestions]);

  // Create filtering state object
  const filteringState: SuggestionFilteringState = {
    appliedSuggestions,
    skippedSuggestions,
    appliedSuggestionContent,
    skippedSuggestionContent
  };

  // Filter suggestions based on applied/skipped state and content existence
  const filteredSuggestions = useMemo(() => {
    return filterSuggestions(suggestions, content, filteringState);
  }, [suggestions, content, filteringState]);

  // Handle applying a suggestion
  const handleApplySuggestion = (suggestion: EssaySuggestion) => {
    const newState = updateFilteringStateOnApply(suggestion, filteringState);
    setAppliedSuggestions(newState.appliedSuggestions);
    setAppliedSuggestionContent(newState.appliedSuggestionContent);
    console.log('✅ Applied suggestion:', suggestion.uuid, 'Total applied:', newState.appliedSuggestions.length);
  };

  // Handle skipping a suggestion
  const handleSkipSuggestion = (suggestion: EssaySuggestion) => {
    const newState = updateFilteringStateOnSkip(suggestion, filteringState);
    setSkippedSuggestions(newState.skippedSuggestions);
    setSkippedSuggestionContent(newState.skippedSuggestionContent);
    console.log('⏭️ Skipped suggestion:', suggestion.uuid, 'Total skipped:', newState.skippedSuggestions.length);
  };

  // Reset all filtering state
  const resetFilteringState = () => {
    setAppliedSuggestions([]);
    setSkippedSuggestions([]);
    setAppliedSuggestionContent(new Set());
    setSkippedSuggestionContent(new Set());
  };

  return {
    filteredSuggestions,
    appliedSuggestions,
    skippedSuggestions,
    handleApplySuggestion,
    handleSkipSuggestion,
    resetFilteringState
  };
} 