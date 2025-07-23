'use client';

import { cn } from '@/lib/utils';
import { Undo2, Redo2, Save, Clock, Check } from 'lucide-react';

interface ToolbarV2Props {
  currentIndex: number;
  historyLength: number;
  onUndo: () => void;
  onRedo: () => void;
  onManualSave: () => void;
  saveStatus: 'unsaved' | 'saving' | 'saved';
  wordCount: number;
  maxWords: number;
}

export function ToolbarV2({
  currentIndex,
  historyLength,
  onUndo,
  onRedo,
  onManualSave,
  saveStatus,
  wordCount,
  maxWords,
}: ToolbarV2Props) {
  return (
    <div className="flex items-center justify-between bg-card rounded-t-[20px] px-4 py-2 border border-border border-b-0 flex-shrink-0">
      <div className="flex gap-4 text-muted-foreground">
        <Undo2
          className={cn(
            'w-4 h-4 cursor-pointer transition-colors',
            currentIndex > 0 ? 'hover:text-foreground' : 'opacity-50 cursor-not-allowed'
          )}
          onClick={onUndo}
        />
        <Redo2
          className={cn(
            'w-4 h-4 cursor-pointer transition-colors',
            currentIndex < historyLength - 1
              ? 'hover:text-foreground'
              : 'opacity-50 cursor-not-allowed'
          )}
          onClick={onRedo}
        />
        <div
          className={cn(
            'w-4 h-4 cursor-pointer flex items-center justify-center transition-colors',
            saveStatus === 'saving'
              ? 'text-yellow-500'
              : saveStatus === 'saved'
                ? 'text-green-500'
                : 'hover:text-foreground'
          )}
          onClick={onManualSave}
          title={
            saveStatus === 'saving'
              ? 'Saving...'
              : saveStatus === 'saved'
                ? 'Saved'
                : 'Unsaved changes'
          }
        >
          {saveStatus === 'saving' ? (
            <Clock className="w-4 h-4 animate-pulse" />
          ) : saveStatus === 'saved' ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
        </div>
      </div>
      <span
        className={cn(
          'text-xs',
          wordCount > maxWords ? 'text-red-500 font-medium' : 'text-muted-foreground'
        )}
      >
        {wordCount} / {maxWords} words
      </span>
    </div>
  );
}
