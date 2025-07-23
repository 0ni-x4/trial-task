'use client';

import { MobileEssayTabV2 } from './MobileEssayTabV2';
import { MobileReviewTabV2 } from './MobileReviewTabV2';
import { MobileCounselorTabV2 } from './MobileCounselorTabV2';

interface Props {
  activeTab: 'essay' | 'review' | 'counselor';
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

export function MobileLayoutV2({
  activeTab,
  essayData,
  editorData,
  reviewData,
  onGenerateReviewAction,
  onApplySuggestionAction,
  onSkipSuggestionAction,
  onSelectSuggestionAction,
  onHighlightAction,
  onEditorChangeAction,
  onEditorUndoAction,
  onEditorRedoAction,
  onEditorManualSaveAction,
  saveChatMessageAction,
  highlights,
}: Props) {
  return (
    <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
      {activeTab === 'essay' && (
        <MobileEssayTabV2
          essayContent={editorData.content}
          onContentChange={onEditorChangeAction}
          highlights={highlights}
          currentIndex={editorData.currentIndex}
          historyLength={editorData.history.length}
          onUndo={onEditorUndoAction}
          onRedo={onEditorRedoAction}
          onManualSave={onEditorManualSaveAction}
          saveStatus={editorData.saveStatus}
          wordCount={editorData.wordCount}
          maxWords={essayData?.maxWords || 500}
        />
      )}

      {activeTab === 'review' && (
        <MobileReviewTabV2
          reviewData={reviewData.reviewData && (reviewData.reviewData.overallScore !== undefined || reviewData.reviewData.metrics?.length > 0) ? reviewData.reviewData : null}
          isReviewLoading={reviewData.isReviewLoading}
          onRefreshAction={() => {
            console.log('🚀 Mobile: Generating first review with suggestions');
            onGenerateReviewAction();
          }}
          onApplySuggestionAction={(suggestion: any, index: number) => {
            onApplySuggestionAction(suggestion, index);
          }}
          onSkipSuggestionAction={(suggestion: any, index: number) => {
            onSkipSuggestionAction(suggestion, index);
          }}
          onSelectSuggestionAction={(suggestion: any, index: number) => {
            onSelectSuggestionAction(suggestion, index);
          }}
          appliedSuggestions={reviewData.appliedSuggestions}
          skippedSuggestions={reviewData.skippedSuggestions}
          selectedSuggestionIndex={reviewData.selectedSuggestionIndex}
          essayContentLength={editorData.content.trim().length}
          hasContentChanged={reviewData.hasContentChanged}
        />
      )}

      {activeTab === 'counselor' && (
        <MobileCounselorTabV2
          essay={editorData.content}
          suggestions={reviewData.reviewData?.suggestions || []}
          onHighlight={onHighlightAction}
          initialMessages={essayData?.messages || []}
          onSaveMessage={saveChatMessageAction}
        />
      )}
    </div>
  );
}
