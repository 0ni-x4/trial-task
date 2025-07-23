'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  essayData: any;
  isMobile: boolean;
}

export function HeaderV2({ essayData, isMobile }: Props) {
  const [showPromptPopup, setShowPromptPopup] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div className="flex flex-col flex-1 min-w-0">
          <h1 className="text-xl lg:text-2xl font-bold text-left mb-2">Essay Assist</h1>
          <h2 className="text-base lg:text-lg text-muted-foreground text-left flex items-baseline gap-1 min-w-0">
            <span className="font-bold text-foreground/60 flex-shrink-0">PROMPT:</span>
            <button
              onClick={() => setShowPromptPopup(true)}
              className="text-left hover:text-foreground cursor-pointer truncate min-w-0 text-lg font-medium leading-relaxed"
              title="Click to view full prompt"
            >
              {essayData.prompt}
            </button>
          </h2>
        </div>
        {!isMobile && (
          <Link href="/essays/assist" passHref legacyBehavior>
            <Button variant="ghost" className="border border-border rounded-full">
              <ArrowLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </Link>
        )}
      </div>

      {/* Prompt Popup */}
      <Dialog open={showPromptPopup} onOpenChange={setShowPromptPopup}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg p-4 gap-3">
          <DialogHeader className="text-left">
            <DialogTitle className="text-lg">Essay Prompt</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-2 border border-border">
              <p className="text-lg font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                {essayData.prompt}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 sm:gap-0 text-xs text-muted-foreground">
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
}
