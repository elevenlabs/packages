import type { ComponentChildren } from "preact";
import { cn } from "../../utils/cn";
import { type HTMLAttributes, type ButtonHTMLAttributes } from "preact/compat";
import { useSignal } from "@preact/signals";
import { IconName } from "../../components/Icon";
import { Button } from "../../components/Button";

export interface ActionConfig {
  icon: IconName;
  label: string;
  onClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  disabled?: boolean;
  "aria-label"?: string;
}

type InfoCardActionsProps = {
  actions: ActionConfig[];
  isVisible: boolean;
  className?: string;
};

function InfoCardActions({
  actions,
  isVisible,
  className,
}: InfoCardActionsProps) {
  return (
    <div
      className={cn(
        "absolute top-1 right-1 z-10 flex items-center gap-1 transition-opacity duration-200 ease-out",
        isVisible ? "opacity-100" : "opacity-0 pointer-events-none",
        className
      )}
    >
      {actions.map((action, index) => (
        <Button
          key={index}
          aria-label={action["aria-label"] || action.label}
          disabled={action.disabled}
          icon={action.icon}
          onClick={action.onClick}
          variant="md-button"
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

type InfoCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ComponentChildren;
  actions?: ActionConfig[];
  containerClassName?: string;
  actionsClassName?: string;
};

export const InfoCard = ({
  children,
  actions,
  className,
  containerClassName,
  actionsClassName,
  ...props
}: InfoCardProps) => {
  const isHovered = useSignal(false);

  return (
    <div
      className={cn(
        "relative my-4 self-stretch rounded-bubble bg-base-active shadow-header overflow-hidden",
        containerClassName
      )}
      onMouseEnter={() => isHovered.value = true}
      onMouseLeave={() => isHovered.value = false}
      {...props}
    >
      {actions && actions.length > 0 && (
        <InfoCardActions
          actions={actions}
          isVisible={isHovered.value}
          className={actionsClassName}
        />
      )}
      <div className={className}>{children}</div>
    </div>
  );
};
