'use client';

import { useMemo, useEffect, useState, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

import { useAssistDataV2 } from '../../hooks/use-assist-data-v2';
import { useEditorStateV2, Highlight } from '../../hooks/use-editor-state-v2';
import { useReviewGeneration } from '../../hooks/use-review-generation';
import { useSuggestionTracking } from '../../hooks/use-suggestion-tracking';
import { useIsMobile } from '../../hooks/use-mobile';

import { HeaderV2 } from './header';
import { DesktopLayoutV2 } from './desktop-layout';
import { MobileLayoutV2 } from './mobile-layout';
import { MobileTabsV2 } from './MobileTabsV2';

interface AssistWorkspaceV2Props {
  assistId: string;
}

export const AssistWorkspaceV2 = ({ assistId }: AssistWorkspaceV2Props) => {
  const isMobile = useIsMobile();

  console.log('🚀 AssistWorkspaceV2 initialized:', {
    assistId,
    hasAssistId: !!assistId,
    assistIdType: typeof assistId
  });

  // UI state
  const [mobileActiveTab, setMobileActiveTab] = useState<'essay' | 'review' | 'counselor'>('essay');

  // Add chat highlights state
  const [chatHighlights, setChatHighlights] = useState<Highlight[]>([]);

  /* -------------------- Data Fetching & State -------------------- */
  const { essayData, isLoading, error, saveChatMessage } = useAssistDataV2(assistId);

  // Memoize editor props to prevent infinite re-renders
  const editorProps = useMemo(() => ({
    initialContent: essayData?.currentContent ?? '',
    history: essayData?.history ?? [''],
    maxWords: essayData?.maxWords ?? 500,
    assistId,
  }), [essayData?.currentContent, essayData?.history, essayData?.maxWords, assistId]);

  console.log('📝 Editor props:', {
    initialContentLength: editorProps.initialContent?.length || 0,
    hasInitialContent: !!editorProps.initialContent,
    initialContentPreview: editorProps.initialContent?.substring(0, 100),
    historyLength: editorProps.history?.length || 0,
    maxWords: editorProps.maxWords,
    assistId: editorProps.assistId
  });

  const editor = useEditorStateV2(editorProps);

  const suggestionTracking = useSuggestionTracking(assistId);

  const review = useReviewGeneration({
    assistId,
    content: editor.content,
    prompt: essayData?.prompt,
    lastReview: essayData?.lastReviewData as any, // Type mismatch - will fix later
    previousContent: essayData?.currentContent,
    appliedSuggestions: suggestionTracking.getAppliedSuggestionUuids(),
    manualEdits: suggestionTracking.manualEdits,
  });

  // --- Auto-trigger review when content is long enough and none exist ---
  const hasTriggeredReview = useRef(false);
  useEffect(() => {
    if (
      editor.content.trim().length >= 50 &&
      (!review.reviewData?.suggestions || review.reviewData.suggestions.length === 0) &&
      !hasTriggeredReview.current
    ) {
      // Generate review with current content
      review.generateReview();
      hasTriggeredReview.current = true;
    }
    // Reset flag if content is cleared (e.g., new session)
    if (editor.content.trim().length < 50) {
      hasTriggeredReview.current = false;
    }
  }, [editor.content, review.reviewData?.suggestions, review.generateReview]);

  /* -------------------- Derived -------------------- */
  // Combine highlights, now including chat highlights
  const combinedHighlights = useMemo(() => {
    return [
      ...editor.wordLimitHighlights,
      ...chatHighlights,
    ];
  }, [editor.wordLimitHighlights, chatHighlights]);

  // Create serializable review data object with placeholder functions
  const serializableReviewData = useMemo(() => ({
    reviewData: review.reviewData,
    isReviewLoading: review.isReviewLoading,
    hasContentChanged: review.hasContentChanged,
    suggestions: review.reviewData?.suggestions || [],
    appliedSuggestions: suggestionTracking.appliedSuggestions.map(s => s.uuid), // Convert to string array
    manualEdits: suggestionTracking.manualEdits,
    // Placeholder functions for compatibility
    handleSkipSuggestion: () => {},
    handleSelectSuggestion: () => {},
    handleHighlight: () => {},
    filteredSuggestions: review.reviewData?.suggestions || [],
    skippedSuggestions: [],
    selectedSuggestionIndex: null,
  }), [review.reviewData, review.isReviewLoading, review.hasContentChanged, suggestionTracking.appliedSuggestions, suggestionTracking.manualEdits]);

  // Enhanced wrapper for suggestion application with real-time content tracking
  const handleApplySuggestion = async (suggestion: any, index: number) => {
    // Apply the suggestion to the content
    const newContent = editor.content.substring(0, suggestion.startIndex) + 
                      suggestion.replacement + 
                      editor.content.substring(suggestion.endIndex);
    
    // Track the applied suggestion
    await suggestionTracking.applySuggestion(suggestion, editor.content.substring(suggestion.startIndex, suggestion.endIndex));
    
    // Update editor content
    const syntheticEvent = {
      target: { value: newContent },
    } as React.ChangeEvent<HTMLTextAreaElement>;
    editor.handleChange(syntheticEvent);
  };

  // Enhanced function to generate review with latest editor content
  const handleGenerateReview = () => {
    console.log('🔄 Workspace: Generating review with content:', {
      contentLength: editor.content?.length || 0,
      hasContent: !!editor.content,
      contentPreview: editor.content?.substring(0, 100),
      wordCount: editor.wordCount
    });
    review.generateReview();
  };

  // Create serializable editor data object
  const serializableEditorData = useMemo(() => ({
    content: editor.content,
    currentIndex: editor.currentIndex,
    history: editor.history,
    wordCount: editor.wordCount,
    saveStatus: editor.saveStatus,
    wordLimitHighlights: editor.wordLimitHighlights,
  }), [editor.content, editor.currentIndex, editor.history, editor.wordCount, editor.saveStatus, editor.wordLimitHighlights]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        editor.handleManualSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor.handleManualSave]);

  /* -------------------- Render -------------------- */
  if (isLoading) {
    return (
      <main className="flex-1 bg-background flex flex-col h-[100dvh] min-h-0 p-6 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">Loading Essay Assist...</div>
            <div className="text-muted-foreground">Please wait while we load your essay.</div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !essayData) {
    return (
      <main className="flex-1 bg-background flex flex-col h-[100dvh] min-h-0 p-6 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2 text-red-600">Error</div>
            <div className="text-muted-foreground mb-4">
              {error ?? 'The essay assist you are looking for does not exist.'}
            </div>
            <Link href="/essays/assist" legacyBehavior passHref>
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Essays
              </Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 bg-background flex flex-col h-[100dvh] min-h-0 p-6 overflow-hidden">
      <HeaderV2 essayData={essayData} isMobile={isMobile} />

      {isMobile ? (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full overflow-hidden">
          <MobileTabsV2 activeTab={mobileActiveTab} onTabChange={setMobileActiveTab} />
          <MobileLayoutV2
            activeTab={mobileActiveTab}
            essayData={essayData}
            editorData={serializableEditorData}
            reviewData={serializableReviewData}
            onGenerateReviewAction={handleGenerateReview}
            onApplySuggestionAction={handleApplySuggestion}
            onSkipSuggestionAction={() => {}}
            onSelectSuggestionAction={() => {}}
            onHighlightAction={setChatHighlights}
            onEditorChangeAction={editor.handleChange}
            onEditorUndoAction={editor.handleUndo}
            onEditorRedoAction={editor.handleRedo}
            onEditorManualSaveAction={editor.handleManualSave}
            saveChatMessageAction={saveChatMessage}
            highlights={combinedHighlights}
          />
        </div>
      ) : (
        <DesktopLayoutV2
          essayData={essayData}
          editorData={serializableEditorData}
          reviewData={serializableReviewData}
          onGenerateReviewAction={handleGenerateReview}
          onApplySuggestionAction={handleApplySuggestion}
          onSkipSuggestionAction={() => {}}
          onSelectSuggestionAction={() => {}}
          onHighlightAction={setChatHighlights}
          onEditorChangeAction={editor.handleChange}
          onEditorUndoAction={editor.handleUndo}
          onEditorRedoAction={editor.handleRedo}
          onEditorManualSaveAction={editor.handleManualSave}
          saveChatMessageAction={saveChatMessage}
          highlights={combinedHighlights}
        />
      )}
    </main>
  );
};
