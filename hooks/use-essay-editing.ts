import { useState, useRef, useCallback, useEffect } from 'react';
import { Highlight } from '@/components/essay-assist/EssayEditor';

export const useEssayEditing = (
  essayAssistId: string,
  initialContent: string,
  initialHistory: string[]
) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const [history, setHistory] = useState<string[]>(initialHistory);
  const [currentIndex, setCurrentIndex] = useState(initialHistory.length - 1);
  const [essayContent, setEssayContent] = useState(initialContent);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Auto-save essay content
  const saveEssayContent = useCallback(
    async (content: string, historyData: string[]) => {
      setSaveStatus('saving');
      try {
        await fetch(`/api/essay-assist/${essayAssistId}`, {
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
    [essayAssistId]
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
    await saveEssayContent(essayContent, history);
  }, [essayContent, history, saveEssayContent]);

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
      setEssayContent(history[newIndex]);
      debouncedSave(history[newIndex], history);
    }
  };

  const handleRedo = () => {
    if (currentIndex < history.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setEssayContent(history[newIndex]);
      debouncedSave(history[newIndex], history);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setEssayContent(newContent);

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
  const getWordLimitHighlights = (maxWords: number): Highlight[] => {
    const wordCount = essayContent.trim() ? essayContent.trim().split(/\s+/).length : 0;
    if (wordCount <= maxWords) return [];

    const words = essayContent.trim().split(/\s+/);
    if (words.length <= maxWords) return [];

    let currentIndex = 0;
    let wordIndex = 0;

    while (wordIndex < maxWords && currentIndex < essayContent.length) {
      while (currentIndex < essayContent.length && /\s/.test(essayContent[currentIndex])) {
        currentIndex++;
      }
      while (currentIndex < essayContent.length && !/\s/.test(essayContent[currentIndex])) {
        currentIndex++;
      }
      wordIndex++;
    }

    while (currentIndex < essayContent.length && /\s/.test(essayContent[currentIndex])) {
      currentIndex++;
    }

    if (currentIndex >= essayContent.length) return [];

    const excessText = essayContent.slice(currentIndex);
    if (excessText.trim().length === 0) return [];

    return [
      {
        text: excessText,
        type: 'negative' as const,
        startIndex: currentIndex,
        endIndex: essayContent.length,
      },
    ];
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Update state when initial values change
  useEffect(() => {
    setEssayContent(initialContent);
    setHistory(initialHistory);
    setCurrentIndex(initialHistory.length - 1);
    setSaveStatus('saved');
  }, [initialContent, initialHistory]);

  const wordCount = essayContent.trim() ? essayContent.trim().split(/\s+/).length : 0;

  return {
    essayContent,
    history,
    currentIndex,
    saveStatus,
    wordCount,
    handleContentChange,
    handleUndo,
    handleRedo,
    handleManualSave,
    getWordLimitHighlights,
  };
};
