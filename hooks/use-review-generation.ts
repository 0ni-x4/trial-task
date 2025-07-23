'use client';

import { useState, useMemo } from 'react';

interface ReviewData {
  overallScore?: number;
  metrics?: Array<{ label: string; value: number }>;
  subGrades?: Array<{ label: string; grade: string }>;
  suggestions?: Array<{
    uuid: string;
    category: string;
    title: string;
    description: string;
    startIndex: number;
    endIndex: number;
    replacement: string;
  }>;
}

interface ManualEdit {
  startIndex: number;
  endIndex: number;
  oldText: string;
  newText: string;
}

interface UseReviewGenerationParams {
  assistId: string;
  content: string;
  prompt?: string;
  lastReview?: ReviewData;
  previousContent?: string;
  appliedSuggestions: string[]; // UUIDs of applied suggestions
  manualEdits: ManualEdit[];
}

export function useReviewGeneration({
  assistId,
  content,
  prompt,
  lastReview,
  previousContent,
  appliedSuggestions = [],
  manualEdits = []
}: UseReviewGenerationParams) {
  const [reviewData, setReviewData] = useState<ReviewData | null>(lastReview ?? null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [lastReviewedContent, setLastReviewedContent] = useState<string>('');

  // Check if content has changed since last review
  const hasContentChanged = useMemo(() => {
    if (!lastReviewedContent) return true;
    return content.trim() !== lastReviewedContent.trim();
  }, [content, lastReviewedContent]);

  // Generate review based on the simplified flow
  const generateReview = async () => {
    if (!content || content.trim().length < 50) {
      console.log('❌ Content too short for review');
      return;
    }

    console.log('🔄 Generating review:', {
      contentLength: content.length,
      appliedSuggestionsCount: appliedSuggestions.length,
      manualEditsCount: manualEdits.length,
      hasPreviousContent: !!previousContent
    });

    setIsReviewLoading(true);
    try {
      const response = await fetch('/api/essay-assist/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistId,
          content,
          prompt,
          previousContent,
          appliedSuggestions,
          manualEdits,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate review');
      }

      if (data.success && data.review) {
        console.log('✅ Review generated:', {
          changeType: data.changeType,
          overallScore: data.review.overallScore,
          suggestionsCount: data.review.suggestions?.length || 0
        });

        setReviewData(data.review);
        setLastReviewedContent(content.trim());
      }
    } catch (error) {
      console.error('❌ Review generation failed:', error);
    } finally {
      setIsReviewLoading(false);
    }
  };

  // Initialize with existing data
  const initializeReviewData = () => {
    if (lastReview) {
      console.log('🔄 Initializing with lastReview:', {
        hasOverallScore: lastReview.overallScore !== undefined,
        hasMetrics: !!lastReview.metrics?.length,
        hasSuggestions: !!lastReview.suggestions?.length
      });
      setReviewData(lastReview);
    } else {
      console.log('🔄 No lastReview data to initialize');
    }
  };

  return {
    reviewData,
    isReviewLoading,
    hasContentChanged,
    lastReviewedContent,
    generateReview,
    initializeReviewData
  };
} 