import { HTMLAttributes } from "preact/compat";
import { clsx } from "clsx";
import { Avatar } from "../components/Avatar";
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
    <div
      className={clsx("rounded-compact-sheet flex items-center p-2", className)}
      {...rest}
    >
      <Avatar className="mx-1" />
      <TriggerActions onDismiss={onDismiss} />
    </div>
  );
}
