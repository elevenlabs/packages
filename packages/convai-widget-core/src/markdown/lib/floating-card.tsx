import type { ComponentChildren } from "preact";
import { cn } from "../../utils/cn";

type FloatingCardProps = {
  children: ComponentChildren;
  actions?: ComponentChildren;
  className?: string;
  containerClassName?: string;
  actionsClassName?: string;
  "data-testid"?: string;
};

/**
 * A card container with floating action buttons that appear on hover.
 * Used for code blocks, tables, and images in markdown rendering.
 */
export const FloatingCard = ({
  children,
  actions,
  className,
  containerClassName,
  actionsClassName,
  "data-testid": dataTestId,
  ...props
}: FloatingCardProps & Record<string, unknown>) => {
  return (
    <div
      className={cn(
        "group relative my-4 self-stretch rounded-button bg-base-active shadow-header overflow-hidden",
        containerClassName
      )}
      data-testid={dataTestId}
      {...props}
    >
      {actions && (
        <div
          className={cn(
            "absolute top-1 right-1 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            actionsClassName
          )}
        >
          {actions}
        </div>
      )}
      <div className={cn(className)}>{children}</div>
    </div>
  );
};

