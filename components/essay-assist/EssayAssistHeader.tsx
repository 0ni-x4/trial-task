'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EssayAssistHeaderProps {
  essayData: {
    prompt: string;
    essayType: string;
    maxWords: number;
  };
  isMobile: boolean;
  onBackClick: () => void;
}

export const EssayAssistHeader = ({ essayData, isMobile, onBackClick }: EssayAssistHeaderProps) => {
  const [showPromptPopup, setShowPromptPopup] = useState(false);

  return (
    <>
      <div className="flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="mb-2 flex-1 min-w-0">
            <div className="flex flex-col items-left w-full">
              <h1 className="text-xl lg:text-2xl font-bold text-left mb-2">Essay Assist</h1>
              <h2 className="text-base text-muted-foreground text-left mb-2 flex items-baseline gap-1 min-w-0">
                <span className="font-bold text-foreground/60 flex-shrink-0">PROMPT:</span>
                <button
                  onClick={() => setShowPromptPopup(true)}
                  className="text-left hover:text-foreground cursor-pointer truncate min-w-0"
                  title="Click to view full prompt"
                >
                  {essayData.prompt}
                </button>
              </h2>
            </div>
          </div>
          {!isMobile && (
            <Button
              onClick={onBackClick}
              variant="ghost"
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 border border-border rounded-full -mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
        </div>
      </div>

      {/* Prompt Popup */}
      <Dialog open={showPromptPopup} onOpenChange={setShowPromptPopup}>
        <DialogContent className="max-w-4xl mx-4 p-4">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-lg">Essay Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{essayData.prompt}</p>
            </div>
            <div className="flex justify-between items-center text-xs text-muted-foreground pt-1">
              <span>
                Essay Type: <span className="capitalize">{essayData.essayType}</span>
              </span>
              <span>Word Limit: {essayData.maxWords} words</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
