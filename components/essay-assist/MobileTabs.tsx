'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface MobileTabsProps {
  activeTab: 'essay' | 'review' | 'counselor';
  onTabChange: (tab: 'essay' | 'review' | 'counselor') => void;
}

export function MobileTabs({ activeTab, onTabChange }: MobileTabsProps) {
  const tabs = [
    { id: 'essay', label: 'Essay' },
    { id: 'review', label: 'Review' },
    { id: 'counselor', label: 'Counselor' },
  ] as const;

  return (
    <div className="flex mb-2 gap-2 w-full flex-shrink-0 min-w-0">
      {tabs.map(tab => (
        <Button
          key={tab.id}
          className={cn(
            'rounded-full py-1 text-sm font-semibold flex-1',
            activeTab === tab.id ? 'bg-[#00AE96] text-white hover:bg-[#089684]' : 'border'
          )}
          variant={activeTab === tab.id ? 'default' : 'outline'}
          onClick={() => onTabChange(tab.id)}
        >
          {tab.label}
        </Button>
      ))}
    </div>
  );
}
