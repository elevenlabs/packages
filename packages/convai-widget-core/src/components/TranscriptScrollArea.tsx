import { ScrollArea } from "@base-ui-components/react/scroll-area";
import { forwardRef } from "preact/compat";
import type { ComponentChildren } from "preact";
import { cn } from "../utils/cn";

type TranscriptScrollAreaProps = {
  children: ComponentChildren;
  className?: string;
  innerClassName?: string;
};

export const TranscriptScrollArea = forwardRef<
  HTMLDivElement,
  TranscriptScrollAreaProps
>(({ children, className, innerClassName }, ref) => {
  return (
    <ScrollArea.Root ref={ref} className={className}>
      <ScrollArea.Viewport 
        data-scroll-viewport
        className="h-full rounded-md overscroll-contain bg-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-800 [box-shadow:0px_8px_9px_0px_var(--el-base)] before:[--scroll-area-overflow-y-start:inherit] after:[--scroll-area-overflow-y-end:inherit] before:content-[''] after:content-[''] before:block after:block before:absolute after:absolute before:left-0 after:left-0 before:w-full after:w-full before:pointer-events-none after:pointer-events-none before:rounded-md after:rounded-md before:transition-[height] after:transition-[height] before:duration-100 after:duration-100 before:ease-out after:ease-out before:top-0 after:bottom-0 before:bg-[linear-gradient(to_bottom,var(--el-base),transparent)] after:bg-[linear-gradient(to_top,var(--el-base),transparent)] before:[height:min(20px,var(--scroll-area-overflow-y-start))] after:[height:min(20px,var(--scroll-area-overflow-y-end,20px))] before:z-10 after:z-10"
      >
        <div className={cn("px-4 pb-3", innerClassName)}>{children}</div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

