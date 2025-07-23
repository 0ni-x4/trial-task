'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { ToolbarV2 } from './editor/ToolbarV2';
import { EssayEditorV2 } from './editor/EssayEditorV2';
import { ScoreCardV2 } from './review/ScoreCardV2';
import { SuggestionsCardV2 } from './review/SuggestionsCardV2';
import { CounselorChatV2 } from './chat/CounselorChatV2';
import { Card } from '@/components/ui/card';
import { RefreshCcw, Lightbulb } from 'lucide-react';

interface Props {
  essayData: any;
  editorData: {
    content: string;
    currentIndex: number;
    history: string[];
    wordCount: number;
    saveStatus: 'saved' | 'saving' | 'unsaved';
    wordLimitHighlights: any[];
  };
  reviewData: {
    reviewData: any;
    isReviewLoading: boolean;
    hasContentChanged: boolean;
    filteredSuggestions: any[];
    appliedSuggestions: string[]; // Track by UUID
    skippedSuggestions: string[]; // Track by UUID
    selectedSuggestionIndex: number | null;
  };
  onGenerateReviewAction: () => void;
  onApplySuggestionAction: (suggestion: any, index: number) => void;
  onSkipSuggestionAction: (suggestion: any, index: number) => void;
  onSelectSuggestionAction: (suggestion: any, index: number) => void;
  onHighlightAction: (highlights: any[]) => void;
  onEditorChangeAction: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onEditorUndoAction: () => void;
  onEditorRedoAction: () => void;
  onEditorManualSaveAction: () => void;
  saveChatMessageAction: any;
  highlights: any[];
}

export function DesktopLayoutV2({ essayData, editorData, reviewData, onGenerateReviewAction, onApplySuggestionAction, onSkipSuggestionAction, onSelectSuggestionAction, onHighlightAction, onEditorChangeAction, onEditorUndoAction, onEditorRedoAction, onEditorManualSaveAction, saveChatMessageAction, highlights }: Props) {
  const [activeTab, setActiveTab] = useState<'review' | 'counselor'>('review');

  return (
    <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
      {/* Editor Section */}
      <div className="lg:col-span-2 flex flex-col min-h-0">
        <ToolbarV2
          currentIndex={editorData.currentIndex}
          historyLength={editorData.history.length}
          onUndo={onEditorUndoAction}
          onRedo={onEditorRedoAction}
          onManualSave={onEditorManualSaveAction}
          saveStatus={editorData.saveStatus}
          wordCount={editorData.wordCount}
          maxWords={essayData.maxWords}
        />
        <div className="flex-1 min-h-0">
          <EssayEditorV2
            value={editorData.content}
            onChange={onEditorChangeAction}
            highlights={highlights}
          />
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-col min-h-0">
        <div className="flex mb-4 gap-2 w-full">
          <Button
            className={cn(
              'rounded-full py-1 text-sm font-semibold flex-1',
              activeTab === 'review' ? 'bg-[#00AE96] text-white hover:bg-[#089684]' : 'border'
            )}
            variant={activeTab === 'review' ? 'default' : 'outline'}
            onClick={() => setActiveTab('review')}
          >
            Review
          </Button>
          <Button
            className={cn(
              'rounded-full py-1 text-sm font-semibold flex-1',
              activeTab === 'counselor' ? 'bg-[#00AE96] text-white hover:bg-[#089684]' : 'border'
            )}
            variant={activeTab === 'counselor' ? 'default' : 'outline'}
            onClick={() => setActiveTab('counselor')}
          >
            Counselor
          </Button>
        </div>

        {activeTab === 'review' ? (
          <div className="flex flex-col min-h-0 flex-1">
            {(() => {
              console.log('🔍 Desktop Review Data Check:', {
                hasReviewData: !!reviewData.reviewData,
                overallScore: reviewData.reviewData?.overallScore,
                metricsLength: reviewData.reviewData?.metrics?.length,
                suggestionsLength: reviewData.reviewData?.suggestions?.length
              });
              return reviewData.reviewData && (reviewData.reviewData.overallScore !== undefined || reviewData.reviewData.metrics?.length > 0);
            })() ? (
              <>
                <ScoreCardV2
                  overallScore={reviewData.reviewData.overallScore}
                  metrics={reviewData.reviewData.metrics || []}
                  subGrades={reviewData.reviewData.subGrades || []}
                />
                <div className="flex justify-center w-full mb-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        className="rounded-full bg-popover border border-border px-6 py-2 text-sm font-medium dark:text-white text-black w-full"
                        onClick={onGenerateReviewAction}
                        disabled={reviewData.isReviewLoading || !reviewData.hasContentChanged}
                      >
                        <RefreshCcw
                          className={cn(
                            'w-4 h-4 mr-2 opacity-60',
                            reviewData.isReviewLoading && 'animate-spin'
                          )}
                        />
                        {reviewData.isReviewLoading ? 'Analyzing...' : 'Refresh Score'}
                      </Button>
                    </TooltipTrigger>
                    {!reviewData.hasContentChanged && (
                      <TooltipContent>
                        <p>You can't refresh until you make changes to the essay</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </div>
                <SuggestionsCardV2
                  suggestions={reviewData.filteredSuggestions || []}
                  onApply={(suggestion, index) => {
                    onApplySuggestionAction(suggestion, index);
                  }}
                  onSkip={(suggestion, index) => {
                    onSkipSuggestionAction(suggestion, index);
                  }}
                  onSelect={(suggestion, index) => {
                    onSelectSuggestionAction(suggestion, index);
                  }}
                  appliedSuggestions={reviewData.appliedSuggestions}
                  skippedSuggestions={reviewData.skippedSuggestions}
                  selectedSuggestionIndex={reviewData.selectedSuggestionIndex}
                />
              </>
            ) : (
              <Card className="rounded-[20px] flex-1 flex flex-col min-h-0">
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Lightbulb className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Review Available</h3>
                  <p className="text-muted-foreground text-sm mb-6 max-w-[200px]">
                    Start writing your essay and click refresh to get AI-powered feedback and
                    suggestions.
                  </p>
                  <Button
                    className="rounded-full bg-[#00AE96] hover:bg-[#089684] text-white px-6 py-2"
                    onClick={() => {
                      console.log('🚀 Generating first review with suggestions');
                      console.log('📝 Editor content check:', {
                        contentLength: editorData.content?.length || 0,
                        hasContent: !!editorData.content,
                        contentPreview: editorData.content?.substring(0, 100),
                        wordCount: editorData.wordCount
                      });
                      onGenerateReviewAction();
                    }}
                    disabled={reviewData.isReviewLoading || editorData.content.trim().length < 50}
                  >
                    <RefreshCcw
                      className={cn('w-4 h-4 mr-2', reviewData.isReviewLoading && 'animate-spin')}
                    />
                    {reviewData.isReviewLoading ? 'Analyzing...' : 'Get Review'}
                  </Button>
                  {editorData.content.trim().length < 50 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Write at least 50 characters to get a review
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
        ) : (
          <CounselorChatV2
            essay={editorData.content}
            suggestions={reviewData.reviewData?.suggestions || []}
            onHighlight={onHighlightAction}
            initialMessages={essayData?.messages || []}
            onSaveMessage={saveChatMessageAction}
          />
        )}
      </div>
    </div>
  );
}
