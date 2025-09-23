import { clsx } from "clsx";
import { SizeTransition } from "../components/SizeTransition";
import { Avatar } from "../components/Avatar";
import { ExpandableTriggerActions } from "./ExpandableTriggerActions";
import { ExpandableProps } from "./Trigger";
import { DismissButton } from "../components/DismissButton";

export function CompactExpandableTrigger({
  expanded,
  className,
  onDismiss,
  ...rest
}: ExpandableProps) {
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
        <SizeTransition visible={!expanded.value} className="p-1">
          <Avatar />
        </SizeTransition>
        <ExpandableTriggerActions expanded={expanded} />
      </div>
    </div>
  );
}
