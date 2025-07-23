'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEssayAssistData } from '@/hooks/use-essay-assist-data';
import { useEssayEditing } from '@/hooks/use-essay-editing';
import { useReviewLogic } from '@/hooks/use-review-logic';
import { EssayAssistHeader } from './EssayAssistHeader';
import { DesktopEditorSection } from './DesktopEditorSection';
import { DesktopReviewPanel } from './DesktopReviewPanel';
import { MobileLayout } from './MobileLayout';
import { MobileTabs } from './MobileTabs';
import { CounselorChat } from './CounselorChat';
import { ArrowLeft } from 'lucide-react';

interface EssayAssistEditorProps {
  essayAssistId: string;
}

export const EssayAssistEditor = ({ essayAssistId }: EssayAssistEditorProps) => {
  const isMobile = useIsMobile();
  const router = useRouter();

  // UI state
  const [activeTab, setActiveTab] = useState<'review' | 'counselor'>('review');
  const [mobileActiveTab, setMobileActiveTab] = useState<'essay' | 'review' | 'counselor'>('essay');

  // Data hooks
  const { essayData, isLoading, error, saveChatMessage } = useEssayAssistData(essayAssistId);

  // Initialize editing hooks once data is loaded
  const editing = useEssayEditing(
    essayAssistId,
    essayData?.currentContent || '',
    essayData?.history || ['']
  );

  const review = useReviewLogic(
    essayAssistId,
    editing.essayContent,
    essayData?.prompt,
    essayData?.lastReviewData,
    editing.wordCount
  );

  // Wrapper for suggestion application to work with editing hook
  const handleApplySuggestion = (suggestion: any, index: number) => {
    review.handleApplySuggestion(suggestion, index, newContent => {
      // This will trigger the editing hook's content change handler
      const syntheticEvent = {
        target: { value: newContent },
      } as React.ChangeEvent<HTMLTextAreaElement>;
      editing.handleContentChange(syntheticEvent);
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        editing.handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editing.handleManualSave]);

  // Combine highlights
  const allHighlights = [
    ...review.highlights,
    ...editing.getWordLimitHighlights(essayData?.maxWords || 500),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Loading Essay Assist...</div>
          <div className="text-muted-foreground">Please wait while we load your essay.</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2 text-red-600">Error</div>
          <div className="text-muted-foreground mb-4">{error}</div>
          <Button onClick={() => router.push('/essays/assist')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Essays
          </Button>
        </div>
      </div>
    );
  }

  if (!essayData) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg font-semibold mb-2">Essay Not Found</div>
          <div className="text-muted-foreground mb-4">
            The essay assist you're looking for doesn't exist.
          </div>
          <Button onClick={() => router.push('/essays/assist')} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Essays
          </Button>
        </div>
      </div>
    );
  }

  return (
    <main className="flex-1 bg-background flex flex-col h-[100dvh] min-h-0 p-4 md:p-4 sm:p-2 overflow-hidden">
      <EssayAssistHeader
        essayData={essayData}
        isMobile={isMobile}
        onBackClick={() => router.push('/essays/assist')}
      />

      {isMobile ? (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-hidden">
          <MobileTabs activeTab={mobileActiveTab} onTabChange={setMobileActiveTab} />
          <MobileLayout
            activeTab={mobileActiveTab}
            essayContent={editing.essayContent}
            onContentChange={editing.handleContentChange}
            highlights={allHighlights}
            currentIndex={editing.currentIndex}
            historyLength={editing.history.length}
            onUndo={editing.handleUndo}
            onRedo={editing.handleRedo}
            onManualSave={editing.handleManualSave}
            saveStatus={editing.saveStatus}
            wordCount={editing.wordCount}
            maxWords={essayData?.maxWords || 500}
            reviewData={review.reviewData}
            isReviewLoading={review.isReviewLoading}
            onRefresh={review.generateReview}
            onApplySuggestion={handleApplySuggestion}
            onSkipSuggestion={review.handleSkipSuggestion}
            appliedSuggestions={review.appliedSuggestions}
            skippedSuggestions={review.skippedSuggestions}
            onHighlight={review.handleHighlight}
            initialMessages={essayData?.messages || []}
            onSaveMessage={saveChatMessage}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <DesktopEditorSection
            essayContent={editing.essayContent}
            onContentChange={editing.handleContentChange}
            highlights={allHighlights}
            currentIndex={editing.currentIndex}
            historyLength={editing.history.length}
            onUndo={editing.handleUndo}
            onRedo={editing.handleRedo}
            onManualSave={editing.handleManualSave}
            saveStatus={editing.saveStatus}
            wordCount={editing.wordCount}
            maxWords={essayData?.maxWords || 500}
          />

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
                  activeTab === 'counselor'
                    ? 'bg-[#00AE96] text-white hover:bg-[#089684]'
                    : 'border'
                )}
                variant={activeTab === 'counselor' ? 'default' : 'outline'}
                onClick={() => setActiveTab('counselor')}
              >
                Counselor
              </Button>
            </div>

            {activeTab === 'review' ? (
              <DesktopReviewPanel
                reviewData={review.reviewData}
                isReviewLoading={review.isReviewLoading}
                onRefresh={review.generateReview}
                onApplySuggestion={handleApplySuggestion}
                onSkipSuggestion={review.handleSkipSuggestion}
                appliedSuggestions={review.appliedSuggestions}
                skippedSuggestions={review.skippedSuggestions}
                essayContent={editing.essayContent}
                onHighlight={review.handleHighlight}
                initialMessages={essayData?.messages || []}
                onSaveMessage={saveChatMessage}
              />
            ) : (
              <CounselorChat
                essay={editing.essayContent}
                suggestions={review.reviewData?.suggestions || []}
                onHighlight={review.handleHighlight}
                initialMessages={essayData?.messages || []}
                onSaveMessage={saveChatMessage}
              />
            )}
          </div>
        </div>
      )}
    </main>
  );
};
