'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RefreshCcw, Lightbulb } from 'lucide-react';
import { ScoreCardV2 } from './review/ScoreCardV2';
import { SuggestionsCardV2 } from './review/SuggestionsCardV2';

type Suggestion = { uuid: string; type: string; from?: string; to?: string; text?: string };

type ReviewData = {
  overallScore: number;
  metrics: Array<{ label: string; value: number }>;
  subGrades: Array<{ label: string; grade: string }>;
  suggestions: Suggestion[];
};

interface MobileReviewTabV2Props {
  reviewData: ReviewData | null;
  isReviewLoading: boolean;
  onRefreshAction: () => void;
  onApplySuggestionAction: (suggestion: Suggestion, index: number) => void;
  onSkipSuggestionAction: (suggestion: Suggestion, index: number) => void;
  onSelectSuggestionAction: (suggestion: Suggestion, index: number) => void;
  appliedSuggestions: string[]; // Track by UUID
  skippedSuggestions: string[]; // Track by UUID
  selectedSuggestionIndex: number | null;
  essayContentLength: number;
  hasContentChanged: boolean;
}

export const MobileReviewTabV2 = ({
  reviewData,
  isReviewLoading,
  onRefreshAction,
  onApplySuggestionAction,
  onSkipSuggestionAction,
  onSelectSuggestionAction,
  appliedSuggestions,
  skippedSuggestions,
  selectedSuggestionIndex,
  essayContentLength,
  hasContentChanged,
}: MobileReviewTabV2Props) => {
  if (!reviewData) {
    return (
      <div className="h-full w-full overflow-hidden">
        <Card className="rounded-[20px] h-full flex flex-col">
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Lightbulb className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Review Available</h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-[200px]">
              Start writing your essay and click refresh to get AI-powered feedback and suggestions.
            </p>
            <Button
              className="rounded-full bg-[#00AE96] hover:bg-[#089684] text-white px-6 py-2"
              onClick={onRefreshAction}
              disabled={isReviewLoading || essayContentLength < 50}
            >
              <RefreshCcw className={cn('w-4 h-4 mr-2', isReviewLoading && 'animate-spin')} />
              {isReviewLoading ? 'Analyzing...' : 'Get Review'}
            </Button>
            {essayContentLength < 50 && (
              <p className="text-xs text-muted-foreground mt-2">
                Write at least 50 characters to get a review
              </p>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <ScoreCardV2
        overallScore={reviewData.overallScore}
        metrics={reviewData.metrics || []}
        subGrades={reviewData.subGrades || []}
      />
      <div className="flex justify-center w-full mb-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              className="rounded-full bg-popover border border-border px-6 py-2 text-sm font-medium dark:text-white text-black w-full"
              onClick={onRefreshAction}
              disabled={isReviewLoading || !hasContentChanged}
            >
              <RefreshCcw
                className={cn('w-4 h-4 mr-2 opacity-60', isReviewLoading && 'animate-spin')}
              />
              {isReviewLoading ? 'Analyzing...' : 'Refresh'}
            </Button>
          </TooltipTrigger>
          {!hasContentChanged && (
            <TooltipContent>
              <p>You can't refresh until you make changes to the essay</p>
            </TooltipContent>
          )}
        </Tooltip>
      </div>
      <SuggestionsCardV2
        suggestions={reviewData.suggestions}
        onApply={onApplySuggestionAction}
        onSkip={onSkipSuggestionAction}
        onSelect={onSelectSuggestionAction}
        appliedSuggestions={appliedSuggestions}
        skippedSuggestions={skippedSuggestions}
        selectedSuggestionIndex={selectedSuggestionIndex}
      />
    </div>
  );
};
