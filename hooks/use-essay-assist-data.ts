import { useState, useEffect } from 'react';
import { Highlight } from '@/components/essay-assist/EssayEditor';

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
  wordCount: number;
  status: string;
  appliedSuggestions?: string[];
  skippedSuggestions?: string[];
  messages: Array<{
    id: string;
    role: string;
    content: string;
    highlights: Highlight[];
    createdAt: string;
  }>;
};

export const useEssayAssistData = (essayAssistId: string) => {
  const [essayData, setEssayData] = useState<EssayAssistData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEssayAssist = async () => {
    try {
      const response = await fetch(`/api/essay-assist/${essayAssistId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load essay assist');
      }

      if (data.success) {
        setEssayData(data.essayAssist);
      }
    } catch (error) {
      console.error('Failed to load essay assist:', error);
      setError(error instanceof Error ? error.message : 'Failed to load essay assist');
    } finally {
      setIsLoading(false);
    }
  };

  const saveChatMessage = async (role: string, content: string, highlights: Highlight[] = []) => {
    try {
      await fetch(`/api/essay-assist/${essayAssistId}/messages`, {
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
  }, [essayAssistId]);

  return {
    essayData,
    isLoading,
    error,
    saveChatMessage,
  };
};
