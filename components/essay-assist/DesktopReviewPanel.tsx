'use client';

import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { RefreshCcw, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScoreCard } from './ScoreCard';
import { SuggestionsCard } from './SuggestionsCard';
import { CounselorChat } from './CounselorChat';
import { Highlight } from './EssayEditor';

type Suggestion = { type: string; from?: string; to?: string; text?: string };

type ReviewData = {
  overallScore: number;
  metrics: Array<{ label: string; value: number }>;
  subGrades: Array<{ label: string; grade: string }>;
  suggestions: Suggestion[];
};

interface DesktopReviewPanelProps {
  reviewData: ReviewData | null;
  isReviewLoading: boolean;
  onRefresh: () => void;
  onApplySuggestion: (suggestion: Suggestion, index: number) => void;
  onSkipSuggestion: (suggestion: Suggestion, index: number) => void;
  appliedSuggestions: Set<number>;
  skippedSuggestions: Set<number>;
  essayContent: string;
  onHighlight: (highlights: Highlight[]) => void;
  initialMessages: Array<{
    id: string;
    role: string;
    content: string;
    highlights: Highlight[];
    createdAt: string;
  }>;
  onSaveMessage: (role: string, content: string, highlights?: Highlight[]) => Promise<void>;
}

export function DesktopReviewPanel({
  reviewData,
  isReviewLoading,
  onRefresh,
  onApplySuggestion,
  onSkipSuggestion,
  appliedSuggestions,
  skippedSuggestions,
  essayContent,
  onHighlight,
  initialMessages,
  onSaveMessage,
}: DesktopReviewPanelProps) {
  return (
    <div className="flex flex-col min-h-0">
      {reviewData ? (
        <>
          <ScoreCard
            overallScore={reviewData.overallScore}
            metrics={reviewData.metrics}
            subGrades={reviewData.subGrades}
          />
          <div className="flex justify-center w-full mb-2">
            <Button
              className="rounded-full bg-popover border border-border px-6 py-2 text-sm font-medium dark:text-white text-black w-full"
              onClick={onRefresh}
              disabled={isReviewLoading}
            >
              <RefreshCcw
                className={cn('w-4 h-4 mr-2 opacity-60', isReviewLoading && 'animate-spin')}
              />
              {isReviewLoading ? 'Analyzing...' : 'Refresh'}
            </Button>
          </div>
          <SuggestionsCard
            suggestions={reviewData.suggestions}
            onApply={onApplySuggestion}
            onSkip={onSkipSuggestion}
            appliedSuggestions={appliedSuggestions}
            skippedSuggestions={skippedSuggestions}
          />
        </>
      ) : (
        <Card className="rounded-[20px] overflow-hidden flex flex-col h-full">
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Lightbulb className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Review Available</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-[200px]">
              Start writing your essay and click refresh to get AI-powered feedback and suggestions.
            </p>
            <Button
              className="rounded-full bg-[#00AE96] hover:bg-[#089684] text-white px-6 py-2"
              onClick={onRefresh}
              disabled={isReviewLoading || essayContent.trim().length < 50}
            >
              <RefreshCcw className={cn('w-4 h-4 mr-2', isReviewLoading && 'animate-spin')} />
              {isReviewLoading ? 'Analyzing...' : 'Get Review'}
            </Button>
            {essayContent.trim().length < 50 && (
              <p className="text-xs text-muted-foreground mt-2">
                Write at least 50 characters to get a review
              </p>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
