'use client';

import { cn } from '@/lib/utils';
import { Undo2, Redo2, Save, Check, Clock } from 'lucide-react';
import { EssayEditor, Highlight } from './EssayEditor';

interface MobileEssayTabProps {
  essayContent: string;
  onContentChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  highlights: Highlight[];
  currentIndex: number;
  historyLength: number;
  onUndo: () => void;
  onRedo: () => void;
  onManualSave: () => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  wordCount: number;
  maxWords: number;
}

export const MobileEssayTab = ({
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
}: MobileEssayTabProps) => {
  return (
    <div className="flex flex-col h-full w-full min-w-0 overflow-hidden">
      {/* Toolbar */}
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
              'w-4 h-4 cursor-pointer transition-colors flex items-center justify-center',
              saveStatus === 'saving'
                ? 'text-yellow-500'
                : saveStatus === 'saved'
                  ? 'text-green-500'
                  : 'hover:text-foreground'
            )}
            onClick={onManualSave}
            title={`${saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Unsaved changes'}`}
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
          {wordCount} word{wordCount !== 1 ? 's' : ''} / {maxWords} words
        </span>
      </div>

      {/* Editor Area */}
      <div className="flex-1 min-h-0 min-w-0 w-full">
        <EssayEditor value={essayContent} onChange={onContentChange} highlights={highlights} />
      </div>
    </div>
  );
};
