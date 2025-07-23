'use client';

import { MobileEssayTab } from './MobileEssayTab';
import { MobileReviewTab } from './MobileReviewTab';
import { MobileCounselorTab } from './MobileCounselorTab';

interface MobileLayoutProps {
  activeTab: 'essay' | 'review' | 'counselor';
  essayContent: string;
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  highlights: any[];
  currentIndex: number;
  historyLength: number;
  onUndo: () => void;
  onRedo: () => void;
  onManualSave: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  wordCount: number;
  maxWords: number;
  reviewData: any;
  isReviewLoading: boolean;
  onRefresh: () => void;
  onApplySuggestion: (suggestion: any, index: number) => void;
  onSkipSuggestion: (suggestion: any, index: number) => void;
  appliedSuggestions: Set<number>;
  skippedSuggestions: Set<number>;
  onHighlight: (highlights: any[]) => void;
  initialMessages: any[];
  onSaveMessage: (role: string, content: string, highlights?: any[]) => Promise<void>;
}

export function MobileLayout({
  activeTab,
  essayContent,
  onContentChange,
  highlights,
  currentIndex,
  historyLength,
  onUndo,
  onRedo,
  onManualSave,
  saveStatus,
  wordCount,
  maxWords,
  reviewData,
  isReviewLoading,
  onRefresh,
  onApplySuggestion,
  onSkipSuggestion,
  appliedSuggestions,
  skippedSuggestions,
  onHighlight,
  initialMessages,
  onSaveMessage,
}: MobileLayoutProps) {
  return (
    <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
      {activeTab === 'essay' && (
        <MobileEssayTab
          essayContent={essayContent}
          onContentChange={onContentChange}
          highlights={highlights}
          currentIndex={currentIndex}
          historyLength={historyLength}
          onUndo={onUndo}
          onRedo={onRedo}
          onManualSave={onManualSave}
          saveStatus={saveStatus}
          wordCount={wordCount}
          maxWords={maxWords}
        />
      )}

      {activeTab === 'review' && (
        <MobileReviewTab
          reviewData={reviewData}
          isReviewLoading={isReviewLoading}
          onRefresh={onRefresh}
          onApplySuggestion={onApplySuggestion}
          onSkipSuggestion={onSkipSuggestion}
          appliedSuggestions={appliedSuggestions}
          skippedSuggestions={skippedSuggestions}
          essayContentLength={essayContent.trim().length}
        />
      )}

      {activeTab === 'counselor' && (
        <MobileCounselorTab
          essay={essayContent}
          suggestions={reviewData?.suggestions || []}
          onHighlight={onHighlight}
          initialMessages={initialMessages}
          onSaveMessage={onSaveMessage}
        />
      )}
    </div>
  );
}
