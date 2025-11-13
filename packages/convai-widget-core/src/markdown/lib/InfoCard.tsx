import type { ComponentChildren } from "preact";
import { cn } from "../../utils/cn";
import { type HTMLAttributes, type ButtonHTMLAttributes } from "preact/compat";
import { IconName } from "../../components/Icon";
import { Button } from "../../components/Button";
import { Signalish } from "../../utils/signalish";

export interface ActionConfig {
  icon: IconName;
  label: string;
  onClick: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
  disabled?: Signalish<boolean>;
  "aria-label"?: string;
}

type InfoCardProps = HTMLAttributes<HTMLDivElement> & {
  children: ComponentChildren;
  actions?: ActionConfig[];
  className?: string;
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
  return (
    <div
      className={cn(
        "group relative my-4 self-stretch rounded-[calc(var(--el-button-radius)-6px)] bg-base-active shadow-header overflow-hidden",
        containerClassName
      )}
      {...props}
    >
      {actions && actions.length > 0 && (
        <div
          className={cn(
            "absolute top-1 right-1 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
            actionsClassName
          )}
        >
          {actions.map((action, index) => (
            <Button
              key={index}
              aria-label={action["aria-label"] || action.label}
              disabled={action.disabled}
              icon={action.icon}
              onClick={action.onClick}
              className="rounded-[calc(var(--el-button-radius)-10px)]"
              iconClassName="text-sm"
              variant="md-button"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
      <div className={cn(className)}>{children}</div>
    </div>
  );
};
