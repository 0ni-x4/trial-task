'use client';

import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FC, useState } from 'react';
import { cn } from '@/lib/utils';

type Suggestion = { uuid: string; type: string; from?: string; to?: string; text?: string };

interface SuggestionsCardProps {
  suggestions: Suggestion[];
  onApply?: (suggestion: Suggestion, index: number) => void;
  onSkip?: (suggestion: Suggestion, index: number) => void;
  onSelect?: (suggestion: Suggestion, index: number) => void;
  appliedSuggestions?: string[]; // Track by UUID
  skippedSuggestions?: string[]; // Track by UUID
  selectedSuggestionIndex?: number | null;
}

export const SuggestionsCardV2: FC<SuggestionsCardProps> = ({
  suggestions,
  onApply,
  onSkip,
  onSelect,
  appliedSuggestions = [],
  skippedSuggestions = [],
  selectedSuggestionIndex = null,
}) => {
  const handleSuggestionClick = (index: number) => {
    if (onSelect) {
      onSelect(suggestions[index], index);
    }
  };

  // Determine if a suggestion is short enough to show in full format before selection
  const isShortSuggestion = (suggestion: Suggestion): boolean => {
    if (!suggestion.from || !suggestion.to) return false;
    const combinedLength = suggestion.from.length + suggestion.to.length;
    return combinedLength <= 45; // Threshold for "short" suggestions
  };

  // Filter out applied and skipped suggestions using UUIDs
  const availableSuggestions = suggestions
    .map((suggestion, index) => ({ suggestion, originalIndex: index }))
    .filter(
      ({ suggestion }) =>
        !appliedSuggestions.includes(suggestion.uuid) && !skippedSuggestions.includes(suggestion.uuid)
    );

  console.log('🔍 SuggestionsCardV2 Debug:', {
    totalSuggestions: suggestions.length,
    appliedSuggestions: appliedSuggestions,
    skippedSuggestions: skippedSuggestions,
    availableSuggestions: availableSuggestions.length,
    suggestionTypes: suggestions.map(s => s.type)
  });

  const handleApply = (suggestion: Suggestion, originalIndex: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('🔧 Applying suggestion:', suggestion.uuid, 'at index:', originalIndex);
    onApply?.(suggestion, originalIndex);
  };

  const handleSkip = (suggestion: Suggestion, originalIndex: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('⏭️ Skipping suggestion:', suggestion.uuid, 'at index:', originalIndex);
    onSkip?.(suggestion, originalIndex);
  };

  return (
    <Card className="rounded-[20px] overflow-hidden flex flex-col h-full relative">
      <div className="flex items-center gap-2 p-4 border-b border-border text-sm font-semibold flex-shrink-0">
        <Lightbulb className="w-4 h-4 text-[#00AE96]" /> Suggestions
        <span className="text-xs text-muted-foreground ml-auto">{availableSuggestions.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="space-y-3 pb-6">
          {availableSuggestions.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              No suggestions available
            </div>
          ) : (
            availableSuggestions.map(({ suggestion: s, originalIndex }, displayIndex) => {
              const isShort = isShortSuggestion(s);
              const isSelected = selectedSuggestionIndex === originalIndex;

              return (
                <div
                  key={originalIndex}
                  className={cn(
                    'p-2 cursor-pointer transition-all duration-200 hover:bg-muted/50 rounded-xl border',
                    isSelected
                      ? 'border-2 border-[#00AE96] bg-[#00AE96]/5'
                      : 'border-border bg-card hover:border-[#00AE96]/30'
                  )}
                  onClick={() => handleSuggestionClick(originalIndex)}
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
                    <div className="flex gap-2 mt-3 p-2 bg-muted/30 rounded-lg">
                      <Button
                        size="sm"
                        className="flex-1 rounded-lg px-4 py-2 text-sm bg-[#00AE96] hover:bg-[#089684] h-8 font-medium"
                        onClick={(e) => handleApply(s, originalIndex, e)}
                      >
                        Apply
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="flex-1 rounded-lg px-4 py-2 text-sm h-8 hover:bg-muted border border-border"
                        onClick={(e) => handleSkip(s, originalIndex, e)}
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
      </div>
      <div className="absolute bottom-0 left-0 right-0 h-16 pointer-events-none bg-gradient-to-t from-background via-background/60 to-transparent" />
    </Card>
  );
};
