'use client';

import { Card } from '@/components/ui/card';
import { CounselorChatV2 } from './chat/CounselorChatV2';
import { Highlight } from '../../hooks/use-editor-state-v2';

type Suggestion = { type: string; from?: string; to?: string; text?: string };

interface MobileCounselorTabV2Props {
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
  onSaveMessage: (role: string, content: string, highlights?: Highlight[]) => void;
}

export const MobileCounselorTabV2 = ({
  essay,
  suggestions,
  onHighlight,
  initialMessages,
  onSaveMessage,
}: MobileCounselorTabV2Props) => {
  return (
    <div className="h-full w-full overflow-hidden">
      <Card className="rounded-[20px] h-full flex flex-col">
        <CounselorChatV2
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
