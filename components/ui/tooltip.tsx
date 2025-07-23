'use client';

import * as React from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/lib/utils';

type TooltipContextType = {
  open: boolean;
  setOpen: (open: boolean) => void;
  delayDuration: number;
  triggerElement: HTMLElement | null;
  setTriggerElement: (element: HTMLElement | null) => void;
};

const TooltipContext = React.createContext<TooltipContextType | null>(null);

const TooltipProvider: React.FC<{ children: React.ReactNode; delayDuration?: number }> = ({
  children,
  delayDuration = 700,
}) => {
  const [open, setOpen] = React.useState(false);
  const [triggerElement, setTriggerElement] = React.useState<HTMLElement | null>(null);

  return (
    <TooltipContext.Provider
      value={{ open, setOpen, delayDuration, triggerElement, setTriggerElement }}
    >
      {children}
    </TooltipContext.Provider>
  );
};

const Tooltip: React.FC<{ children: React.ReactNode; delayDuration?: number }> = ({
  children,
  delayDuration,
}) => {
  const [open, setOpen] = React.useState(false);
  const [triggerElement, setTriggerElement] = React.useState<HTMLElement | null>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout>();

  const contextValue = React.useMemo(
    () => ({
      open,
      setOpen,
      delayDuration: delayDuration ?? 700,
      triggerElement,
      setTriggerElement,
    }),
    [open, delayDuration, triggerElement]
  );

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return <TooltipContext.Provider value={contextValue}>{children}</TooltipContext.Provider>;
};

const TooltipTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLAttributes<HTMLElement> & { asChild?: boolean }
>(({ children, asChild = false, ...props }, ref) => {
  const context = React.useContext(TooltipContext);
  if (!context) throw new Error('TooltipTrigger must be used within a Tooltip');

  const { setOpen, delayDuration, setTriggerElement } = context;
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const elementRef = React.useRef<HTMLElement>(null);

  React.useImperativeHandle(ref, () => elementRef.current!);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTriggerElement(e.currentTarget);
    timeoutRef.current = setTimeout(() => setOpen(true), delayDuration);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  const handleFocus = (e: React.FocusEvent<HTMLElement>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setTriggerElement(e.currentTarget);
    setOpen(true);
  };

  const handleBlur = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(false);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...props,
      ref: elementRef,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onFocus: handleFocus,
      onBlur: handleBlur,
    } as any);
  }

  return (
    <span
      ref={elementRef as any}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      {...props}
    >
      {children}
    </span>
  );
});
TooltipTrigger.displayName = 'TooltipTrigger';

const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    showArrow?: boolean;
    side?: 'top' | 'right' | 'bottom' | 'left';
    align?: 'start' | 'center' | 'end';
    sideOffset?: number;
    alignOffset?: number;
    hidden?: boolean;
  }
>(
  (
    {
      className,
      sideOffset = 4,
      alignOffset = 0,
      showArrow = false,
      side = 'top',
      align = 'center',
      hidden = false,
      children,
      ...props
    },
    ref
  ) => {
    const context = React.useContext(TooltipContext);
    if (!context) throw new Error('TooltipContent must be used within a Tooltip');

    const { open, setOpen, triggerElement } = context;
    const [position, setPosition] = React.useState({ x: 0, y: 0 });
    const [actualSide, setActualSide] = React.useState(side);
    const contentRef = React.useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = React.useState(false);

    React.useImperativeHandle(ref, () => contentRef.current!);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    React.useEffect(() => {
      if (!open || hidden || !triggerElement || !contentRef.current) return;

      const updatePosition = () => {
        if (!triggerElement || !contentRef.current) return;

        const triggerRect = triggerElement.getBoundingClientRect();
        const contentRect = contentRef.current.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let x = 0;
        let y = 0;
        let finalSide = side;

        // Check if we can fit on top first (preferred)
        const spaceAbove = triggerRect.top;
        const spaceBelow = viewportHeight - triggerRect.bottom;
        const spaceLeft = triggerRect.left;
        const spaceRight = viewportWidth - triggerRect.right;

        // If side is auto or we need to choose the best side
        if (side === 'top' || side === 'bottom') {
          // Prefer top if there's enough space or if it has more space than bottom
          if (spaceAbove >= contentRect.height + sideOffset || spaceAbove > spaceBelow) {
            finalSide = 'top';
          } else {
            finalSide = 'bottom';
          }
        } else if (side === 'left' || side === 'right') {
          // For horizontal, choose based on available space
          if (spaceLeft >= contentRect.width + sideOffset && spaceLeft > spaceRight) {
            finalSide = 'left';
          } else {
            finalSide = 'right';
          }
        }

        // Calculate position based on final side
        switch (finalSide) {
          case 'top':
            x = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
            y = triggerRect.top - contentRect.height - sideOffset;
            break;
          case 'bottom':
            x = triggerRect.left + triggerRect.width / 2 - contentRect.width / 2;
            y = triggerRect.bottom + sideOffset;
            break;
          case 'left':
            x = triggerRect.left - contentRect.width - sideOffset;
            y = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
            break;
          case 'right':
            x = triggerRect.right + sideOffset;
            y = triggerRect.top + triggerRect.height / 2 - contentRect.height / 2;
            break;
        }

        // Apply align offset
        if (finalSide === 'top' || finalSide === 'bottom') {
          if (align === 'start') x = triggerRect.left + alignOffset;
          if (align === 'end') x = triggerRect.right - contentRect.width - alignOffset;
          if (align === 'center') x += alignOffset;
        } else {
          if (align === 'start') y = triggerRect.top + alignOffset;
          if (align === 'end') y = triggerRect.bottom - contentRect.height - alignOffset;
          if (align === 'center') y += alignOffset;
        }

        // Keep within viewport bounds
        x = Math.max(8, Math.min(x, viewportWidth - contentRect.width - 8));
        y = Math.max(8, Math.min(y, viewportHeight - contentRect.height - 8));

        setPosition({ x, y });
        setActualSide(finalSide);
      };

      // Initial position calculation
      const timeoutId = setTimeout(updatePosition, 0);

      // Update position on scroll/resize
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }, [open, side, align, sideOffset, alignOffset, hidden, triggerElement]);

    if (!mounted || !open || hidden) return null;

    const content = (
      <div
        ref={contentRef}
        className={cn(
          'fixed z-50 w-auto max-w-[90vw] whitespace-nowrap rounded-lg border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground',
          'animate-in fade-in-0 zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          actualSide === 'bottom' && 'data-[side=bottom]:slide-in-from-top-2',
          actualSide === 'left' && 'data-[side=left]:slide-in-from-right-2',
          actualSide === 'right' && 'data-[side=right]:slide-in-from-left-2',
          actualSide === 'top' && 'data-[side=top]:slide-in-from-bottom-2',
          className
        )}
        style={{
          left: position.x,
          top: position.y,
        }}
        data-side={actualSide}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        {...props}
      >
        {children}
        {showArrow && (
          <div
            className={cn(
              'absolute w-2 h-2 bg-popover border-border rotate-45',
              actualSide === 'top' &&
                'bottom-[-4px] left-1/2 transform -translate-x-1/2 border-b border-r',
              actualSide === 'bottom' &&
                'top-[-4px] left-1/2 transform -translate-x-1/2 border-t border-l',
              actualSide === 'left' &&
                'right-[-4px] top-1/2 transform -translate-y-1/2 border-t border-r',
              actualSide === 'right' &&
                'left-[-4px] top-1/2 transform -translate-y-1/2 border-b border-l'
            )}
          />
        )}
      </div>
    );

    return createPortal(content, document.body);
  }
);
TooltipContent.displayName = 'TooltipContent';

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
