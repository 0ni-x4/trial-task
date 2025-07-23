'use client';

import * as React from 'react';
import * as SliderPrimitive from '@radix-ui/react-slider';

import { cn } from '@/lib/utils';

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    className={cn('relative flex w-full touch-none select-none items-center', className)}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-slate-900/20 dark:bg-slate-50/20">
      <SliderPrimitive.Range className="absolute h-full bg-[#00AE96] dark:bg-[#00AE96]" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border border-[#00AE96] bg-[#00AE96] shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#00AE96] disabled:pointer-events-none disabled:opacity-50 dark:border-[#00AE96] dark:bg-[#00AE96] dark:focus-visible:ring-[#00AE96]" />
  </SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
