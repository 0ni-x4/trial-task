import { useState, useEffect } from 'react';
import { Highlight } from '@/components/essay-assist/EssayEditor';

type Suggestion = { type: string; from?: string; to?: string; text?: string };

type ReviewData = {
  overallScore: number;
  metrics: Array<{ label: string; value: number }>;
  subGrades: Array<{ label: string; grade: string }>;
  suggestions: Suggestion[];
};

export const useReviewLogic = (
  essayAssistId: string,
  essayContent: string,
  prompt?: string,
  initialReviewData?: ReviewData,
  wordCount: number = 0
) => {
  const [reviewData, setReviewData] = useState<ReviewData | null>(initialReviewData || null);
  const [isReviewLoading, setIsReviewLoading] = useState(false);
  const [lastReviewWordCount, setLastReviewWordCount] = useState(0);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<number>>(new Set());
  const [skippedSuggestions, setSkippedSuggestions] = useState<Set<number>>(new Set());
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  // Generate AI review
  const generateReview = async (content: string = essayContent) => {
    if (!content.trim() || content.trim().length < 50) return;

    setIsReviewLoading(true);
    try {
      const response = await fetch('/api/essay-assist/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          essayContent: content,
          prompt: prompt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate review');
      }

      if (data.success && data.review) {
        setReviewData(data.review);
        setLastReviewWordCount(wordCount);
        setAppliedSuggestions(new Set());
        setSkippedSuggestions(new Set());

        // Save review data to database
        await fetch(`/api/essay-assist/${essayAssistId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lastReviewData: data.review,
          }),
        });
      }
    } catch (error) {
      console.error('❌ Review generation failed:', error);
    } finally {
      setIsReviewLoading(false);
    }
  };

  // Handle applying suggestions
  const handleApplySuggestion = (
    suggestion: Suggestion,
    index: number,
    onContentUpdate: (content: string) => void
  ) => {
    if (!suggestion.from || !suggestion.to) return;

    const normalizeQuotes = (text: string) => {
      return text.replace(/['']/g, "'").replace(/[""]/g, '"').replace(/…/g, '...');
    };

    const normalizedContent = normalizeQuotes(essayContent.toLowerCase());
    const normalizedFrom = normalizeQuotes(suggestion.from.toLowerCase());

    const startIndex = normalizedContent.indexOf(normalizedFrom);

    if (startIndex === -1) {
      console.log('❌ Text not found:', suggestion.from);
      return;
    }

    const actualFromText = essayContent.slice(startIndex, startIndex + suggestion.from.length);

    const newContent =
      essayContent.slice(0, startIndex) +
      suggestion.to +
      essayContent.slice(startIndex + actualFromText.length);

    onContentUpdate(newContent);

    // Add temporary highlight
    const tempHighlight: Highlight = {
      text: suggestion.to,
      type: 'positive',
      startIndex: startIndex,
      endIndex: startIndex + suggestion.to.length,
      temporary: true,
      fadeOut: false,
    };

    setHighlights(prev => [...prev, tempHighlight]);

    setTimeout(() => {
      setHighlights(prev =>
        prev.map(h =>
          h.temporary &&
          h.startIndex === tempHighlight.startIndex &&
          h.endIndex === tempHighlight.endIndex &&
          h.text === tempHighlight.text
            ? { ...h, fadeOut: true }
            : h
        )
      );
    }, 300);

    setTimeout(() => {
      setHighlights(prev =>
        prev.filter(
          h =>
            !(
              h.temporary &&
              h.startIndex === tempHighlight.startIndex &&
              h.endIndex === tempHighlight.endIndex &&
              h.text === tempHighlight.text
            )
        )
      );
    }, 1300);

    setAppliedSuggestions(prev => new Set(prev).add(index));
  };

  const handleSkipSuggestion = (suggestion: Suggestion, index: number) => {
    setSkippedSuggestions(prev => new Set(prev).add(index));
  };

  const handleHighlight = (newHighlights: Highlight[]) => {
    setHighlights(newHighlights);
  };

  // Sync suggestion states with content
  useEffect(() => {
    if (!reviewData?.suggestions) return;

    const normalizeQuotes = (text: string) => {
      return text.replace(/['']/g, "'").replace(/[""]/g, '"').replace(/…/g, '...');
    };

    const currentContent = normalizeQuotes(essayContent.toLowerCase());
    const newAppliedSuggestions = new Set<number>();
    const newSkippedSuggestions = new Set<number>();

    reviewData.suggestions.forEach((suggestion, index) => {
      if (!suggestion.from || !suggestion.to) return;

      const normalizedFrom = normalizeQuotes(suggestion.from.toLowerCase());
      const normalizedTo = normalizeQuotes(suggestion.to.toLowerCase());

      const hasFromText = currentContent.includes(normalizedFrom);
      const hasToText = currentContent.includes(normalizedTo);

      if (hasToText && !hasFromText) {
        newAppliedSuggestions.add(index);
      } else if (skippedSuggestions.has(index) && !hasToText) {
        newSkippedSuggestions.add(index);
      }
    });

    const appliedChanged =
      newAppliedSuggestions.size !== appliedSuggestions.size ||
      Array.from(newAppliedSuggestions).some(id => !appliedSuggestions.has(id));
    const skippedChanged =
      newSkippedSuggestions.size !== skippedSuggestions.size ||
      Array.from(newSkippedSuggestions).some(id => !skippedSuggestions.has(id));

    if (appliedChanged) {
      setAppliedSuggestions(newAppliedSuggestions);
    }
    if (skippedChanged) {
      setSkippedSuggestions(newSkippedSuggestions);
    }
  }, [essayContent, reviewData?.suggestions]);

  // Initialize with existing data
  useEffect(() => {
    if (initialReviewData) {
      setReviewData(initialReviewData);
    }
  }, [initialReviewData]);

  return {
    reviewData,
    isReviewLoading,
    appliedSuggestions,
    skippedSuggestions,
    highlights,
    generateReview,
    handleApplySuggestion,
    handleSkipSuggestion,
    handleHighlight,
  };
};
