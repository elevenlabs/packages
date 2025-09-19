import { HTMLAttributes } from "preact/compat";
import { clsx } from "clsx";
import { Avatar } from "../components/Avatar";
import { DismissButton } from "../components/DismissButton";
import { TriggerActions } from "./TriggerActions";

interface CompactTriggerProps extends HTMLAttributes<HTMLDivElement> {
  onDismiss?: () => void;
}

export function CompactTrigger({
  className,
  onDismiss,
  ...rest
}: CompactTriggerProps) {
  return (
    <div className="relative">
      {onDismiss && (
        <DismissButton
          onDismiss={onDismiss}
          className="absolute -top-1 -right-1 z-10"
        />
      )}
      <div
        className={clsx(
          "rounded-compact-sheet flex items-center p-2",
          className
        )}
        {...rest}
      >
        <Avatar className="mx-1" />
        <TriggerActions />
      </div>
    </div>
  );
}
