'use client';

import { useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

export interface Highlight {
  text: string;
  type: 'positive' | 'negative' | 'warning' | 'neutral' | 'selected' | 'applied';
  startIndex?: number;
  endIndex?: number;
  temporary?: boolean;
  fadeOut?: boolean;
}

interface Props {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  highlights: Highlight[];
}

export function EssayEditorV2({ value = '', onChange, highlights = [] }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const getHighlightColor = (type: string) => {
    switch (type) {
      case 'positive':
        return 'rgba(0, 174, 150, 0.2)';
      case 'negative':
        return 'rgba(239, 68, 68, 0.15)';
      case 'warning':
        return 'rgba(234, 179, 8, 0.15)';
      case 'neutral':
        return 'rgba(156, 163, 175, 0.15)';
      case 'selected':
        return 'rgba(59, 130, 246, 0.2)';
      case 'applied':
        return 'rgba(0, 174, 150, 0.15)';
      default:
        return 'transparent';
    }
  };

  const getHighlightedText = useCallback(() => {
    const text = String(value);

    if (!highlights.length || !text) {
      return escapeHtml(text);
    }

    // Create an array to track which characters are highlighted and their types
    const charHighlights: (Highlight['type'] | null)[] = new Array(text.length).fill(null);
    const charFadeOut: boolean[] = new Array(text.length).fill(false);
    const charTemporary: boolean[] = new Array(text.length).fill(false);
    const highlightRanges: Array<{
      start: number;
      end: number;
      type: Highlight['type'];
      fadeOut?: boolean;
      temporary?: boolean;
    }> = [];

    // Process each highlight
    highlights.forEach((highlight, index) => {
      let startIdx: number;
      let endIdx: number;

      if (highlight.startIndex !== undefined && highlight.endIndex !== undefined) {
        // Use provided indices
        startIdx = highlight.startIndex;
        endIdx = highlight.endIndex;
      } else {
        // Search for the text
        const idx = text.toLowerCase().indexOf(highlight.text.toLowerCase());
        if (idx === -1) {
          console.log(`❌ Highlight text "${highlight.text}" not found in essay`);
          return;
        }
        startIdx = idx;
        endIdx = idx + highlight.text.length;
      }

      if (startIdx >= 0 && endIdx <= text.length) {
        highlightRanges.push({
          start: startIdx,
          end: endIdx,
          type: highlight.type,
          fadeOut: highlight.fadeOut,
          temporary: highlight.temporary,
        });

        // Mark characters as highlighted (priority: selected > negative > warning > positive > applied > neutral)
        const priority = {
          selected: 6,
          negative: 5,
          warning: 4,
          positive: 3,
          applied: 2,
          neutral: 1,
        };
        for (let i = startIdx; i < endIdx; i++) {
          if (!charHighlights[i] || priority[highlight.type] > priority[charHighlights[i]!]) {
            charHighlights[i] = highlight.type;
            charFadeOut[i] = highlight.fadeOut || false;
            charTemporary[i] = highlight.temporary || false;
          }
        }
      }
    });

    // Build the highlighted HTML
    let result = '';
    let i = 0;

    while (i < text.length) {
      const currentType = charHighlights[i];

      if (currentType) {
        // Find the end of this highlight sequence
        let j = i;
        const isFadeOut = charFadeOut[i];
        const isTemporary = charTemporary[i];
        while (
          j < text.length &&
          charHighlights[j] === currentType &&
          charFadeOut[j] === isFadeOut &&
          charTemporary[j] === isTemporary
        ) {
          j++;
        }

        const highlightedText = escapeHtml(text.slice(i, j));

        // For temporary highlights, let CSS animations handle the background color
        if (isTemporary) {
          let fadeClass = '';
          if (currentType === 'applied') {
            fadeClass = isFadeOut ? 'applied-highlight-fade-out' : 'applied-highlight-fade-in';
          } else {
            fadeClass = isFadeOut
              ? 'suggestion-highlight-fade-out'
              : 'suggestion-highlight-fade-in';
          }
          result += `<mark style="color: inherit;" class="${fadeClass}">${highlightedText}</mark>`;
        } else {
          const color = getHighlightColor(currentType);
          result += `<mark style="background-color: ${color}; color: inherit;">${highlightedText}</mark>`;
        }
        i = j;
      } else {
        // Regular text
        let j = i;
        while (j < text.length && !charHighlights[j]) {
          j++;
        }
        result += escapeHtml(text.slice(i, j));
        i = j;
      }
    }

    return result;
  }, [value, highlights]);

  // Sync scroll between textarea and overlay
  const syncScroll = useCallback(() => {
    const textarea = textareaRef.current;
    const pre = preRef.current;
    if (!textarea || !pre) return;

    pre.scrollTop = textarea.scrollTop;
    pre.scrollLeft = textarea.scrollLeft;
  }, []);

  // Set up scroll synchronization
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea || !highlights.length) return;

    textarea.addEventListener('scroll', syncScroll);
    textarea.addEventListener('input', syncScroll);

    return () => {
      textarea.removeEventListener('scroll', syncScroll);
      textarea.removeEventListener('input', syncScroll);
    };
  }, [highlights, syncScroll]);

  // Initial sync when highlights change
  useEffect(() => {
    if (highlights.length > 0) {
      syncScroll();
    }
  }, [highlights, syncScroll]);

  const sharedStyles = {
    fontFamily:
      'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    fontSize: '16px',
    lineHeight: '1.625',
    letterSpacing: 'normal',
    wordSpacing: 'normal',
    tabSize: 4,
    whiteSpace: 'pre-wrap' as const,
    wordWrap: 'break-word' as const,
    padding: '16px',
    margin: '0',
    border: 'none',
    outline: 'none',
  };

  const hasHighlights = highlights.length > 0;

  return (
    <div className="relative h-full min-w-0 overflow-hidden bg-card border border-t-0 border-border rounded-b-[20px]">
      <style jsx>{`
        .suggestion-highlight-fade-in {
          background-color: rgba(0, 174, 150, 0.2);
          transition: background-color 0.3s ease-in;
        }
        .suggestion-highlight-fade-out {
          background-color: rgba(0, 174, 150, 0);
          transition: background-color 0.3s ease-out;
        }
        .applied-highlight-fade-in {
          background-color: rgba(0, 174, 150, 0.15);
          transition: background-color 0.3s ease-in;
        }
        .applied-highlight-fade-out {
          background-color: rgba(0, 174, 150, 0);
          transition: background-color 1s ease-out;
        }
      `}</style>

      {/* Highlighting overlay */}
      {hasHighlights && (
        <pre
          ref={preRef}
          className="absolute inset-0 pointer-events-none overflow-auto resize-none scrollbar-thin text-foreground"
          style={{
            ...sharedStyles,
            background: 'transparent',
            zIndex: 1,
          }}
          dangerouslySetInnerHTML={{ __html: getHighlightedText() }}
        />
      )}

      {/* Text editor */}
      <textarea
        ref={textareaRef}
        className={cn(
          'relative bg-transparent resize-none outline-none focus:ring-0 h-full w-full rounded-[5px] scrollbar-thin',
          hasHighlights
            ? 'text-transparent caret-foreground selection:bg-teal-600/30'
            : 'text-foreground'
        )}
        style={{
          ...sharedStyles,
          background: 'transparent',
          color: hasHighlights ? 'transparent' : undefined,
          caretColor: hasHighlights ? 'hsl(var(--foreground))' : 'auto',
          zIndex: hasHighlights ? 2 : 1,
        }}
        value={value}
        onChange={onChange}
      />
    </div>
  );
}
