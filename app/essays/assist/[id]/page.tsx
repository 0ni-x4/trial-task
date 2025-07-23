'use client';

import dynamic from 'next/dynamic';

// Dynamically import the workspace to prevent server-side rendering
const AssistWorkspaceV2 = dynamic(
  () => import('@/components/essay-assist-v2/Workspace').then(mod => ({ default: mod.AssistWorkspaceV2 })),
  { 
    ssr: false,
    loading: () => (
      <div className="flex-1 bg-background flex flex-col h-[100dvh] min-h-0 p-6 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-semibold mb-2">Loading Essay Assist...</div>
            <div className="text-muted-foreground">Please wait while we load your essay.</div>
          </div>
        </div>
      </div>
    )
  }
);

interface EssayAssistPageV2Props {
  params: {
    id: string;
  };
}

const EssayAssistPageV2 = ({ params }: EssayAssistPageV2Props) => {
  return (
      <AssistWorkspaceV2 assistId={params.id} />
  );
};

export default EssayAssistPageV2;
