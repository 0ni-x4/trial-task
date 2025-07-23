'use client';

import { Card } from '@/components/ui/card';
import { CounselorChat } from './CounselorChat';
import { Highlight } from './EssayEditor';

type Suggestion = { type: string; from?: string; to?: string; text?: string };

interface MobileCounselorTabProps {
  essay: string;
  suggestions: Suggestion[];
  onHighlight: (highlights: Highlight[]) => void;
  initialMessages: Array<{
    id: string;
    role: string;
    content: string;
    highlights: Highlight[];
    createdAt: string;
  }>;
  onSaveMessage: (role: string, content: string, highlights?: Highlight[]) => Promise<void>;
}

export const MobileCounselorTab = ({
  essay,
  suggestions,
  onHighlight,
  initialMessages,
  onSaveMessage,
}: MobileCounselorTabProps) => {
  return (
    <div className="h-full w-full overflow-hidden">
      <Card className="rounded-[20px] h-full flex flex-col">
        <CounselorChat
          essay={essay}
          suggestions={suggestions}
          onHighlight={onHighlight}
          initialMessages={initialMessages}
          onSaveMessage={onSaveMessage}
        />
      </Card>
    </div>
  );
};
