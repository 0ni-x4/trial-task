'use client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, MoreVertical, Clock, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface EssayAssist {
  id: string;
  createdAt: string;
  updatedAt: string;
  prompt: string;
  essayType: string;
  maxWords: number;
  wordCount: number;
  status: string;
  lastReviewAt?: string;
  currentContent: string;
}

const EssayAssistPage = () => {
  const isMobile = useIsMobile();
  const router = useRouter();

  // UI state for existing dialog
  const [open, setOpen] = useState(false);
  const [essayPrompt, setEssayPrompt] = useState('');
  const [essayType, setEssayType] = useState<'personal' | 'supplemental' | 'other'>('personal');
  const [maxWords, setMaxWords] = useState<number>(500);
  const [isCreating, setIsCreating] = useState(false);

  // Data state
  const [essayAssists, setEssayAssists] = useState<EssayAssist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load essay assists on mount
  useEffect(() => {
    loadEssayAssists();
  }, []);

  const loadEssayAssists = async () => {
    try {
      const response = await fetch('/api/essay-assist');
      const data = await response.json();

      if (data.success) {
        setEssayAssists(data.essayAssists);
      }
    } catch (error) {
      console.error('Failed to load essay assists:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const createEssayAssist = async () => {
    if (!essayPrompt.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/essay-assist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: essayPrompt.trim(),
          essayType: essayType,
          maxWords: maxWords,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Close dialog and navigate to the new essay
        setOpen(false);
        setEssayPrompt('');
        setEssayType('personal');
        setMaxWords(500);
        router.push(`/essays/assist/${data.essayAssist.id}`);
      } else {
        console.error('Failed to create essay assist:', data.error);
      }
    } catch (error) {
      console.error('Failed to create essay assist:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const deleteEssayAssist = async (essayId: string) => {
    try {
      const response = await fetch(`/api/essay-assist/${essayId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        // Remove the essay from the local state
        setEssayAssists(prev => prev.filter(essay => essay.id !== essayId));
      } else {
        console.error('Failed to delete essay assist:', data.error);
      }
    } catch (error) {
      console.error('Failed to delete essay assist:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
  };

  const content = (
    <main className="flex-1 bg-background flex flex-col h-full p-6">
      {/* Header */}
      <div className="flex flex-col w-full flex-shrink-0">
        <h1 className="text-xl lg:text-2xl font-bold text-left mb-2">Essay Assist</h1>
        <h2 className="text-base lg:text-lg text-muted-foreground text-left mb-4 lg:mb-8">
          Get real-time tips and edits tailored to your college prompts.
        </h2>
      </div>

      {/* Mobile recommendation card */}
      {isMobile && (
        <Card className="mb-6 rounded-[20px] border border-border bg-card">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-foreground mb-2">Heads up!</h3>
            <p className="text-xs text-muted-foreground">
              For the best experience using Essay Assist, we recommend switching to a laptop or
              desktop computer.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md w-full p-3 rounded-[20px]">
          <DialogHeader>
            <DialogTitle>Essay Details</DialogTitle>
          </DialogHeader>

          {/* Essay Prompt */}
          <div className="space-y-2 mt-2 mb-6">
            <label className="text-sm font-medium">Essay Prompt</label>
            <Input
              value={essayPrompt}
              onChange={e => setEssayPrompt(e.target.value)}
              placeholder="Enter your prompt..."
            />
          </div>

          {/* Types of Essays */}
          <div className="space-y-2 mb-6">
            <label className="text-sm font-medium">Types of Essays</label>
            <div className="flex gap-3 mt-1">
              <Button
                variant={essayType === 'personal' ? 'default' : 'outline'}
                className={cn(
                  'rounded-full px-6',
                  essayType === 'personal' ? 'bg-[#00AE96] hover:bg-[#089684]' : ''
                )}
                onClick={() => setEssayType('personal')}
              >
                Personal
              </Button>
              <Button
                variant={essayType === 'supplemental' ? 'default' : 'outline'}
                className={cn(
                  'rounded-full px-6',
                  essayType === 'supplemental' ? 'bg-[#00AE96] hover:bg-[#089684]' : ''
                )}
                onClick={() => setEssayType('supplemental')}
              >
                Supplemental
              </Button>
              <Button
                variant={essayType === 'other' ? 'default' : 'outline'}
                className={cn(
                  'rounded-full px-6',
                  essayType === 'other' ? 'bg-[#00AE96] hover:bg-[#089684]' : ''
                )}
                onClick={() => setEssayType('other')}
              >
                Other
              </Button>
            </div>
          </div>

          {/* Max Words */}
          <div className="space-y-2 mb-8">
            <label className="text-sm font-medium">Max words</label>
            <div className="flex items-center gap-3">
              <Slider
                value={[maxWords]}
                max={1000}
                min={100}
                step={10}
                onValueChange={val => setMaxWords(val[0])}
              />
              <span className="text-sm text-muted-foreground w-16 text-right">
                {maxWords} words
              </span>
            </div>
          </div>

          <Button
            className="w-full bg-[#00AE96] hover:bg-[#089684] rounded-full"
            onClick={createEssayAssist}
            disabled={!essayPrompt.trim() || isCreating}
          >
            {isCreating ? 'Creating...' : 'Create'}
          </Button>

          <DialogClose asChild>
            <button className="absolute top-4 right-4">✕</button>
          </DialogClose>
        </DialogContent>
      </Dialog>

      {/* Grid of Cards */}
      <div
        className={cn(
          'grid gap-4 mb-6',
          isMobile ? 'grid-cols-2 mb-6' : 'grid-cols-1 md:grid-cols-2 mb-6 lg:grid-cols-3'
        )}
      >
        {/* Create New Essay Card */}
        <Card
          className="flex flex-col items-center justify-center h-44 bg-muted/50 rounded-[20px] border-2 border-dashed border-muted-foreground/30 cursor-pointer hover:bg-muted/40 transition-colors p-4"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-6 w-6 text-teal-500 mb-2" />
          <span className="text-teal-500 font-medium">Create new essay</span>
        </Card>

        {/* Loading state */}
        {isLoading && (
          <>
            {[1, 2, 3].map(i => (
              <Card
                key={i}
                className="p-4 h-44 bg-card rounded-[20px] border border-border opacity-60 transition-opacity"
              >
                <div className="flex items-start justify-between text-xs text-muted-foreground mb-1">
                  <div className="h-3 bg-muted rounded w-20"></div>
                  <div className="h-3 bg-muted rounded w-3"></div>
                </div>
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="space-y-1">
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                </div>
              </Card>
            ))}
          </>
        )}

        {/* Existing Essay Draft Cards */}
        {!isLoading &&
          essayAssists.map(essay => (
            <Card
              key={essay.id}
              className="p-3 h-44 bg-card rounded-[20px] border border-border cursor-pointer hover:shadow-md transition-shadow flex flex-col relative overflow-hidden"
              onClick={() => router.push(`/essays/assist/${essay.id}`)}
            >
              <div className="flex items-start justify-between text-xs text-muted-foreground mb-1 relative z-10">
                <span className="flex items-center">
                  <Clock className="w-3 h-3 mr-1" />
                  Created: {formatDate(essay.createdAt)}
                </span>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="p-1 hover:bg-muted rounded-md transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <MoreVertical className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-32 bg-popover">
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600 cursor-pointer"
                      onClick={e => {
                        e.stopPropagation();
                        deleteEssayAssist(essay.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1 line-clamp-1">
                {truncateText(essay.prompt)}
              </h3>
              <div className="relative flex-1 overflow-hidden">
                <p className="text-sm text-muted-foreground overflow-hidden">
                  {essay.currentContent}
                </p>
                <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-card to-transparent pointer-events-none" />
              </div>
              <div className="flex items-center justify-end mt-2 text-xs text-muted-foreground relative z-10">
                <span>{essay.wordCount} words</span>
              </div>
            </Card>
          ))}

        {/* Empty state when no essays */}
        {!isLoading && essayAssists.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
            <p className="text-muted-foreground mb-4">
              No essays yet. Click "Create new essay" to get started!
            </p>
          </div>
        )}
      </div>
    </main>
  );

  return (
      <div className="h-full overflow-hidden">
        {isMobile ? (
          <ScrollArea className="h-full w-full">{content}</ScrollArea>
        ) : (
          <ScrollArea className="h-full w-full">{content}</ScrollArea>
        )}
      </div>
  );
};

export default EssayAssistPage;
