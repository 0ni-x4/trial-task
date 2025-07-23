'use client';

import { useState, useCallback } from 'react';

interface AppliedSuggestion {
  uuid: string;
  appliedText: string;
  originalText: string;
  startIndex: number;
  endIndex: number;
  appliedAt: Date;
}

interface ManualEdit {
  startIndex: number;
  endIndex: number;
  oldText: string;
  newText: string;
  editedAt: Date;
}

export function useSuggestionTracking(assistId: string) {
  const [appliedSuggestions, setAppliedSuggestions] = useState<AppliedSuggestion[]>([]);
  const [manualEdits, setManualEdits] = useState<ManualEdit[]>([]);

  // Apply a suggestion and track it
  const applySuggestion = useCallback(async (
    suggestion: {
      uuid: string;
      replacement: string;
      startIndex: number;
      endIndex: number;
    },
    originalText: string
  ) => {
    const appliedSuggestion: AppliedSuggestion = {
      uuid: suggestion.uuid,
      appliedText: suggestion.replacement,
      originalText,
      startIndex: suggestion.startIndex,
      endIndex: suggestion.endIndex,
      appliedAt: new Date(),
    };

    // Track locally
    setAppliedSuggestions(prev => [...prev, appliedSuggestion]);

    // Save to database
    try {
      await fetch(`/api/essay-assist/${assistId}/apply-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionUuid: suggestion.uuid,
          appliedText: suggestion.replacement,
          originalText,
          startIndex: suggestion.startIndex,
          endIndex: suggestion.endIndex,
        }),
      });
    } catch (error) {
      console.error('Failed to track applied suggestion:', error);
    }

    return appliedSuggestion;
  }, [assistId]);

  // Track manual edit
  const trackManualEdit = useCallback((
    startIndex: number,
    endIndex: number,
    oldText: string,
    newText: string
  ) => {
    const manualEdit: ManualEdit = {
      startIndex,
      endIndex,
      oldText,
      newText,
      editedAt: new Date(),
    };

    setManualEdits(prev => [...prev, manualEdit]);
  }, []);

  // Get all applied suggestion UUIDs
  const getAppliedSuggestionUuids = useCallback(() => {
    return appliedSuggestions.map(s => s.uuid);
  }, [appliedSuggestions]);

  // Clear tracking data (useful for new sessions)
  const clearTracking = useCallback(() => {
    setAppliedSuggestions([]);
    setManualEdits([]);
  }, []);

  return {
    appliedSuggestions,
    manualEdits,
    applySuggestion,
    trackManualEdit,
    getAppliedSuggestionUuids,
    clearTracking,
  };
} 