'use client';

import { useState, useEffect } from 'react';

type ReviewData = {
  overallScore: number;
  metrics: Array<{ label: string; value: number }>;
  subGrades: Array<{ label: string; grade: string }>;
  suggestions: Array<{ type: string; from?: string; to?: string; text?: string }>;
};

type EssayAssistData = {
  id: string;
  prompt: string;
  essayType: string;
  maxWords: number;
  currentContent: string;
  history: string[];
  lastReviewData?: ReviewData;
  lastReviewAt?: string;
  reviewHistory: ReviewData[]; // Array of all previous reviews
  suggestions: any[]; // Current suggestions from database
  appliedSuggestions?: string[]; // Applied suggestion UUIDs
  skippedSuggestions?: string[]; // Skipped suggestion UUIDs
  wordCount: number;
  status: string;
  messages: Array<{
    id: string;
    role: string;
    content: string;
    highlights: any[];
    createdAt: string;
  }>;
};

// Utility function to ensure all data is serializable
const makeSerializable = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'function') {
    return undefined; // Remove functions
  }
  
  if (obj instanceof Date) {
    return obj.toISOString(); // Convert dates to strings
  }
  
  if (Array.isArray(obj)) {
    return obj.map(makeSerializable).filter(item => item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const serialized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const serializedValue = makeSerializable(value);
      if (serializedValue !== undefined) {
        serialized[key] = serializedValue;
      }
    }
    return serialized;
  }
  
  return obj;
};

export function useAssistDataV2(assistId: string) {
  const [essayData, setEssayData] = useState<EssayAssistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEssayAssist = async () => {
    try {
      const response = await fetch(`/api/essay-assist/${assistId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load essay assist');
      }

      if (data.success) {
        console.log('📊 Database Essay Data:', {
          id: data.essayAssist.id,
          historyVersions: data.essayAssist.history?.length || 0,
          reviewHistoryCount: data.essayAssist.reviewHistory?.length || 0,
          suggestionsCount: data.essayAssist.suggestions?.length || 0,
          lastReviewAt: data.essayAssist.lastReviewAt,
          hasLastReviewData: !!data.essayAssist.lastReviewData
        });

        // Ensure all data is serializable before setting state
        const serializedData = makeSerializable({
          id: data.essayAssist.id,
          prompt: data.essayAssist.prompt,
          essayType: data.essayAssist.essayType,
          maxWords: data.essayAssist.maxWords,
          currentContent: data.essayAssist.currentContent,
          history: data.essayAssist.history || [],
          lastReviewData: data.essayAssist.lastReviewData,
          lastReviewAt: data.essayAssist.lastReviewAt,
          reviewHistory: data.essayAssist.reviewHistory || [],
          suggestions: data.essayAssist.suggestions || [],
          appliedSuggestions: data.essayAssist.appliedSuggestions || [],
          skippedSuggestions: data.essayAssist.skippedSuggestions || [],
          wordCount: data.essayAssist.wordCount,
          status: data.essayAssist.status,
          messages: data.essayAssist.messages || [],
        });

        setEssayData(serializedData);
        
        console.log('📋 Loaded Essay Data:', {
          id: serializedData.id,
          currentContentLength: serializedData.currentContent?.length || 0,
          hasCurrentContent: !!serializedData.currentContent,
          historyLength: serializedData.history?.length || 0,
          maxWords: serializedData.maxWords,
          hasLastReviewData: !!serializedData.lastReviewData
        });
      }
    } catch (err) {
      console.error('❌ Failed to load essay assist:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  };

  const saveChatMessage = async (role: string, content: string, highlights: any[] = []) => {
    try {
      await fetch(`/api/essay-assist/${assistId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          content,
          highlights,
        }),
      });
      console.log('💾 Saved chat message to database');
    } catch (error) {
      console.error('Failed to save chat message:', error);
    }
  };

  useEffect(() => {
    loadEssayAssist();
  }, [assistId]);

  return {
    essayData,
    isLoading,
    error,
    saveChatMessage,
  } as const;
}
