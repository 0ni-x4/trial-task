import { useState, useEffect } from 'react';
import { Highlight } from '@/components/essay-assist/EssayEditor';

type Suggestion = { 
  uuid: string;
  category: string;
  title: string;
  description: string;
  startIndex: number;
  endIndex: number;
  replacement: string;
  originalText: string;
  type?: string; 
  from?: string; 
  to?: string; 
  text?: string;
};

type ReviewData = {
  overallScore: number;
  metrics: Array<{ label: string; value: number }>;
  subGrades: Array<{ label: string; grade: string }>;
  suggestions: Suggestion[];
  version?: string;
  generationType?: string;
  focusedRegions?: string[];
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
  const [lastReviewContent, setLastReviewContent] = useState('');
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());
  const [skippedSuggestions, setSkippedSuggestions] = useState<Set<string>>(new Set());
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [isFirstReview, setIsFirstReview] = useState(!initialReviewData);

  // Generate AI review using the new diff-based system
  const generateReview = async (content: string = essayContent) => {
    if (!content.trim() || content.trim().length < 50) return;

    setIsReviewLoading(true);
    try {
      // Collect applied suggestion IDs from the current session
      const appliedSuggestionIds = Array.from(appliedSuggestions);

      const response = await fetch('/api/essay-assist/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assistId: essayAssistId,
          content: content,
          prompt: prompt,
          appliedSuggestionIds,
          isFirstReview
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate review');
      }

      if (data.success && data.review) {
        setReviewData(data.review);
        setLastReviewContent(content);
        setIsFirstReview(false);

        // Only reset applied/skipped suggestions if we got new suggestions
        if (data.review.suggestions && data.review.suggestions.length > 0) {
          // Don't reset if this was a score-only update
          if (data.generationType !== 'score_update_only') {
            setAppliedSuggestions(new Set());
            setSkippedSuggestions(new Set());
          }
        }

        console.log('🎯 Review generated:', {
          changeType: data.changeType,
          suggestionCount: data.suggestionCount,
          generationType: data.generationType,
          overallScore: data.review.overallScore
        });

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

  // Handle applying suggestions with proper tracking
  const handleApplySuggestion = (
    suggestion: Suggestion,
    index: number,
    onContentUpdate: (content: string) => void
  ) => {
    const originalText = suggestion.originalText || suggestion.from || '';
    const replacementText = suggestion.replacement || suggestion.to || '';
    
    if (!originalText || !replacementText) {
      console.warn('❌ Suggestion missing text data:', suggestion);
      return;
    }

    const normalizeQuotes = (text: string) => {
      return text.replace(/['']/g, "'").replace(/[""]/g, '"').replace(/…/g, '...');
    };

    const normalizedContent = normalizeQuotes(essayContent.toLowerCase());
    const normalizedFrom = normalizeQuotes(originalText.toLowerCase());

    const startIndex = normalizedContent.indexOf(normalizedFrom);

    if (startIndex === -1) {
      console.log('❌ Text not found in essay:', originalText);
      return;
    }

    const actualFromText = essayContent.slice(startIndex, startIndex + originalText.length);
    const endIndex = startIndex + originalText.length;

    const newContent =
      essayContent.slice(0, startIndex) +
      replacementText +
      essayContent.slice(endIndex);

    // Update content first
    onContentUpdate(newContent);

    // Track suggestion as applied
    trackAppliedSuggestion(suggestion, startIndex, endIndex, actualFromText, replacementText);

    // Add temporary highlight
    const tempHighlight: Highlight = {
      text: replacementText,
      type: 'positive',
      startIndex: startIndex,
      endIndex: startIndex + replacementText.length,
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

    setAppliedSuggestions(prev => new Set(prev).add(suggestion.uuid));
  };

  // Track applied suggestion in the backend
  const trackAppliedSuggestion = async (
    suggestion: Suggestion,
    startIndex: number,
    endIndex: number,
    originalText: string,
    appliedText: string
  ) => {
    try {
      await fetch(`/api/essay-assist/${essayAssistId}/apply-suggestion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          suggestionUuid: suggestion.uuid,
          appliedText,
          originalText,
          startIndex,
          endIndex,
          category: suggestion.category
        }),
      });
    } catch (error) {
      console.error('❌ Failed to track applied suggestion:', error);
    }
  };

  const handleSkipSuggestion = (suggestion: Suggestion, index: number) => {
    setSkippedSuggestions(prev => new Set(prev).add(suggestion.uuid));
  };

  const handleHighlight = (newHighlights: Highlight[]) => {
    setHighlights(newHighlights);
  };

  // Sync suggestion states with content - more intelligent detection
  useEffect(() => {
    if (!reviewData?.suggestions) return;

    const normalizeQuotes = (text: string) => {
      return text.replace(/['']/g, "'").replace(/[""]/g, '"').replace(/…/g, '...');
    };

    const currentContent = normalizeQuotes(essayContent.toLowerCase());
    const newAppliedSuggestions = new Set<string>();
    const newSkippedSuggestions = new Set<string>();

    reviewData.suggestions.forEach((suggestion) => {
      const originalText = suggestion.originalText || suggestion.from || '';
      const replacementText = suggestion.replacement || suggestion.to || '';
      
      if (!originalText || !replacementText) return;

      const normalizedFrom = normalizeQuotes(originalText.toLowerCase());
      const normalizedTo = normalizeQuotes(replacementText.toLowerCase());

      const hasFromText = currentContent.includes(normalizedFrom);
      const hasToText = currentContent.includes(normalizedTo);

      // If replacement text is present and original is not, suggestion was applied
      if (hasToText && !hasFromText) {
        newAppliedSuggestions.add(suggestion.uuid);
      } 
      // If manually skipped and neither text is present, keep as skipped
      else if (skippedSuggestions.has(suggestion.uuid) && !hasToText && !hasFromText) {
        newSkippedSuggestions.add(suggestion.uuid);
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
      setLastReviewContent(essayContent);
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
    isFirstReview,
  };
};