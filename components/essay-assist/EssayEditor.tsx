import { FC, TextareaHTMLAttributes, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Save, Check, Clock } from 'lucide-react';

export interface Highlight {
  text: string;
  type: 'positive' | 'negative' | 'warning' | 'neutral';
  startIndex?: number;
  endIndex?: number;
  temporary?: boolean;
  fadeOut?: boolean;
}

interface EssayEditorProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  highlights?: Highlight[];
}

export const EssayEditor: FC<EssayEditorProps> = ({
  highlights = [],
  className,
  value = '',
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);

  // Debug highlight prop changes
  useEffect(() => {
    console.log('🎨 EssayEditor received highlights:', highlights);
  }, [highlights]);

  const escapeHtml = (str: string) =>
    str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const getHighlightColor = (type: Highlight['type']) => {
    switch (type) {
      case 'positive':
        return 'rgba(34, 197, 94, 0.3)'; // Green
      case 'negative':
        return 'rgba(239, 68, 68, 0.3)'; // Red
      case 'warning':
        return 'rgba(245, 158, 11, 0.3)'; // Yellow/Orange
      case 'neutral':
      default:
        return 'rgba(0, 174, 150, 0.3)'; // Teal (default)
    }
  };

  const getHighlightedText = useCallback(() => {
    const text = String(value);

    console.log('🔍 getHighlightedText called:', {
      hasHighlights: highlights.length > 0,
      highlightCount: highlights.length,
      textLength: text.length,
      textPreview: text.substring(0, 50) + '...',
    });

    if (!highlights.length || !text) {
      console.log('❌ No highlights or text, returning plain text');
      return escapeHtml(text);
    }

    // Create an array to track which characters are highlighted and their types
    const charHighlights: (Highlight['type'] | null)[] = new Array(text.length).fill(null);
    const charFadeOut: boolean[] = new Array(text.length).fill(false);
    const highlightRanges: Array<{
      start: number;
      end: number;
      type: Highlight['type'];
      fadeOut?: boolean;
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

      console.log(`🔍 Highlight ${index + 1}:`, {
        text: highlight.text,
        type: highlight.type,
        startIdx,
        endIdx,
        found: startIdx !== -1,
      });

      if (startIdx >= 0 && endIdx <= text.length) {
        highlightRanges.push({
          start: startIdx,
          end: endIdx,
          type: highlight.type,
          fadeOut: highlight.fadeOut,
        });

        // Mark characters as highlighted (priority: negative > warning > positive > neutral)
        const priority = { negative: 4, warning: 3, positive: 2, neutral: 1 };
        for (let i = startIdx; i < endIdx; i++) {
          if (!charHighlights[i] || priority[highlight.type] > priority[charHighlights[i]!]) {
            charHighlights[i] = highlight.type;
            charFadeOut[i] = highlight.fadeOut || false;
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
        while (
          j < text.length &&
          charHighlights[j] === currentType &&
          charFadeOut[j] === isFadeOut
        ) {
          j++;
        }

        const highlightedText = escapeHtml(text.slice(i, j));

        // For temporary highlights, let CSS animations handle the background color
        const isTemporary = highlights.some(
          h =>
            h.temporary &&
            h.startIndex !== undefined &&
            h.endIndex !== undefined &&
            h.startIndex <= i &&
            h.endIndex >= j
        );

        if (isTemporary) {
          const fadeClass = isFadeOut
            ? 'suggestion-highlight-fade-out'
            : 'suggestion-highlight-fade-in';
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

    console.log('✅ Generated multi-colored highlighted HTML successfully');
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
    fontSize: '14px',
    lineHeight: '1.5',
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
            : 'text-foreground',
          className
        )}
        style={{
          ...sharedStyles,
          background: 'transparent',
          color: hasHighlights ? 'transparent' : undefined,
          caretColor: hasHighlights ? 'hsl(var(--foreground))' : 'auto',
          zIndex: hasHighlights ? 2 : 1,
        }}
        value={value}
        {...props}
      />
    </div>
  );
};
