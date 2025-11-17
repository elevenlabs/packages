import type { ComponentChildren } from "preact";
import type { HTMLAttributes } from "preact/compat";
import { cn } from "../../utils/cn";

type ContentBlockRootProps = HTMLAttributes<HTMLDivElement> & {
  children: ComponentChildren;
};

function ContentBlockRoot({ children, className, ...props }: ContentBlockRootProps) {
  return (
    <div
      className={cn(
        "group relative my-4 self-stretch rounded-bubble bg-base-active shadow-header overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type ContentBlockActionsProps = HTMLAttributes<HTMLDivElement> & {
  children: ComponentChildren;
};

function ContentBlockActions({ children, className, ...props }: ContentBlockActionsProps) {
  return (
    <div
      className={cn(
        "absolute top-1 right-1 z-10 flex items-center gap-1 transition-opacity duration-200 ease-out opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type ContentBlockContentProps = HTMLAttributes<HTMLDivElement> & {
  children: ComponentChildren;
};

function ContentBlockContent({ children, className, ...props }: ContentBlockContentProps) {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
}

export const ContentBlock = Object.assign(ContentBlockRoot, {
  Actions: ContentBlockActions,
  Content: ContentBlockContent,
});

