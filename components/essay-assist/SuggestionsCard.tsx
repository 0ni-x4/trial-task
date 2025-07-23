import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FC, useState } from 'react';
import { cn } from '@/lib/utils';

type Suggestion = { type: string; from?: string; to?: string; text?: string };

interface SuggestionsCardProps {
  suggestions: Suggestion[];
  onApply?: (suggestion: Suggestion, index: number) => void;
  onSkip?: (suggestion: Suggestion, index: number) => void;
  appliedSuggestions?: Set<number>;
  skippedSuggestions?: Set<number>;
}

export const SuggestionsCard: FC<SuggestionsCardProps> = ({
  suggestions,
  onApply,
  onSkip,
  appliedSuggestions = new Set(),
  skippedSuggestions = new Set(),
}) => {
  const [selectedSuggestion, setSelectedSuggestion] = useState<number | null>(null);

  const handleSuggestionClick = (index: number) => {
    setSelectedSuggestion(selectedSuggestion === index ? null : index);
  };

  // Determine if a suggestion is short enough to show in full format before selection
  const isShortSuggestion = (suggestion: Suggestion): boolean => {
    if (!suggestion.from || !suggestion.to) return false;
    const combinedLength = suggestion.from.length + suggestion.to.length;
    return combinedLength <= 45; // Threshold for "short" suggestions
  };

  // Filter out applied and skipped suggestions with original indices
  const availableSuggestions = suggestions
    .map((suggestion, originalIndex) => ({ suggestion, originalIndex }))
    .filter(
      ({ originalIndex }) =>
        !appliedSuggestions.has(originalIndex) && !skippedSuggestions.has(originalIndex)
    );

  const handleApply = (suggestion: Suggestion, originalIndex: number) => {
    onApply?.(suggestion, originalIndex);
    setSelectedSuggestion(null);
  };

  const handleSkip = (suggestion: Suggestion, originalIndex: number) => {
    onSkip?.(suggestion, originalIndex);
    setSelectedSuggestion(null);
  };

  return (
    <Card className="rounded-[20px] overflow-hidden flex flex-col h-full relative">
      <div className="flex items-center gap-2 p-4 border-b border-border text-sm font-semibold flex-shrink-0">
        <Lightbulb className="w-4 h-4 text-[#00AE96]" /> Suggestions
        <span className="text-xs text-muted-foreground ml-auto">{availableSuggestions.length}</span>
      </div>
      <ScrollArea className="h-80 p-3">
        <div className="space-y-3 pb-6">
          {availableSuggestions.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No suggestions available
            </div>
          ) : (
            availableSuggestions.map(({ suggestion: s, originalIndex }, displayIndex) => {
              const isShort = isShortSuggestion(s);
              const isSelected = selectedSuggestion === displayIndex;

              return (
                <div
                  key={originalIndex}
                  className={cn(
                    'p-2 cursor-pointer transition-all duration-200 hover:bg-muted/50 rounded-xl border',
                    isSelected
                      ? 'border-2 border-[#00AE96] bg-[#00AE96]/5'
                      : 'border-border bg-card hover:border-[#00AE96]/30'
                  )}
                  onClick={() => handleSuggestionClick(displayIndex)}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#00AE96]">{s.type}</p>
                  </div>

                  {/* Content with smart truncation */}
                  {s.from && (
                    <p className={cn('text-sm mt-1', !isSelected && !isShort && 'line-clamp-1')}>
                      {isSelected || isShort ? (
                        <>
                          {s.from}{' '}
                          <span className="mx-[1px] text-muted-foreground font-bold">&rsaquo;</span>{' '}
                          <strong>{s.to}</strong>
                        </>
                      ) : (
                        <span className="line-clamp-1">{s.from}</span>
                      )}
                    </p>
                  )}
                  {s.text && (
                    <p
                      className={cn(
                        'text-sm mt-1 text-muted-foreground',
                        !isSelected && 'line-clamp-1'
                      )}
                    >
                      {s.text}
                    </p>
                  )}

                  {/* Buttons - only show when selected */}
                  {isSelected && (
                    <div className="flex gap-1.5 mt-2">
                      <Button
                        size="sm"
                        className="rounded-full px-3 py-1 text-xs bg-[#00AE96] hover:bg-[#089684] h-6"
                        onClick={e => {
                          e.stopPropagation();
                          handleApply(s, originalIndex);
                        }}
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="rounded-full px-3 py-1 text-xs h-6 hover:bg-muted border border-border"
                        onClick={e => {
                          e.stopPropagation();
                          handleSkip(s, originalIndex);
                        }}
                      >
                        Skip
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none bg-gradient-to-t from-background via-background/60 to-transparent" />
    </Card>
  );
};
