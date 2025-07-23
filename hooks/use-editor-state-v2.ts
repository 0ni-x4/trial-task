'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface Highlight {
  text: string;
  type: 'positive' | 'negative' | 'warning' | 'neutral' | 'selected' | 'applied';
  startIndex?: number;
  endIndex?: number;
  temporary?: boolean;
  fadeOut?: boolean;
  suggestionIndex?: number;
  exactPosition?: number; // Track exact position for deletion detection
}

interface Params {
  initialContent: string;
  history: string[];
  maxWords: number;
  assistId: string;
}

export function useEditorStateV2({
  initialContent,
  history: initialHistory,
  maxWords,
  assistId,
}: Params) {
  console.log('🔄 Editor hook initialized:', {
    initialContentLength: initialContent?.length || 0,
    hasInitialContent: !!initialContent,
    initialContentPreview: initialContent?.substring(0, 100),
    historyLength: initialHistory?.length || 0,
    maxWords,
    assistId
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const [history, setHistory] = useState<string[]>(initialHistory);
  const [currentIndex, setCurrentIndex] = useState(initialHistory.length - 1);
  const [content, setContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Debug content changes
  useEffect(() => {
    console.log('📝 Editor content updated:', {
      contentLength: content?.length || 0,
      hasContent: !!content,
      contentPreview: content?.substring(0, 100)
    });
  }, [content]);

  // Auto-save essay content
  const saveEssayContent = useCallback(
    async (content: string, historyData: string[]) => {
      setSaveStatus('saving');
      try {
        await fetch(`/api/essay-assist/${assistId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            currentContent: content,
            history: historyData,
          }),
        });
        setSaveStatus('saved');
      } catch (error) {
        console.error('Failed to save essay content:', error);
        setSaveStatus('unsaved');
      }
    },
    [assistId]
  );

  // Debounced save
  const debouncedSave = useCallback(
    (content: string, historyData: string[]) => {
      setSaveStatus('unsaved');

      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        saveEssayContent(content, historyData);
      }, 2000);
    },
    [saveEssayContent]
  );

  // Manual save
  const handleManualSave = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await saveEssayContent(content, history);
  }, [content, history, saveEssayContent]);

  // History management
  const addToHistory = (content: string) => {
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(content);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
    return newHistory;
  };

  const handleUndo = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setContent(history[newIndex]);
      debouncedSave(history[newIndex], history);
    }
  };

  const handleRedo = () => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setContent(history[newIndex]);
      debouncedSave(history[newIndex], history);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (newContent !== history[currentIndex]) {
        const newHistory = addToHistory(newContent);
        debouncedSave(newContent, newHistory);
      }
    }, 1000);
  };

  // Word limit highlighting
  const wordLimitHighlights: Highlight[] = (() => {
    const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
    if (wordCount <= maxWords) return [];

    const words = content.trim().split(/\s+/);
    if (words.length <= maxWords) return [];

    let currentIndex = 0;
    let wordIndex = 0;

    while (wordIndex < maxWords && currentIndex < content.length) {
      while (currentIndex < content.length && /\s/.test(content[currentIndex])) {
        currentIndex++;
      }
      while (currentIndex < content.length && !/\s/.test(content[currentIndex])) {
        currentIndex++;
      }
      wordIndex++;
    }

    while (currentIndex < content.length && /\s/.test(content[currentIndex])) {
      currentIndex++;
    }

    if (currentIndex >= content.length) return [];

    const excessText = content.slice(currentIndex);
    if (excessText.trim().length === 0) return [];

    return [
      {
        text: excessText,
        type: 'negative' as const,
        startIndex: currentIndex,
        endIndex: content.length,
      },
    ];
  })();

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Update state when initial values change
  useEffect(() => {
    setContent(initialContent);
    setHistory(initialHistory);
    setCurrentIndex(initialHistory.length - 1);
    setSaveStatus('saved');
  }, [initialContent, initialHistory]);

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;

  return {
    content,
    history,
    currentIndex,
    saveStatus,
    wordCount,
    wordLimitHighlights,
    handleChange,
    handleUndo,
    handleRedo,
    handleManualSave,
  } as const;
}
