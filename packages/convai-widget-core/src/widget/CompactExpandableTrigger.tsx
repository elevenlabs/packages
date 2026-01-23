import { clsx } from "clsx";
import { SizeTransition } from "../components/SizeTransition";
import { Avatar } from "../components/Avatar";
import { ExpandableTriggerActions } from "./ExpandableTriggerActions";
import { ExpandableProps } from "./Trigger";

interface CompactExpandableTriggerProps extends ExpandableProps {
  onDismiss?: () => void;
}

export function CompactExpandableTrigger({
  expanded,
  className,
  onDismiss,
  ...rest
}: CompactExpandableTriggerProps) {
  return (
    <div
      className={clsx("rounded-compact-sheet flex items-center p-2", className)}
      {...rest}
    >
      <SizeTransition visible={!expanded.value} className="p-1">
        <Avatar />
      </SizeTransition>
      <ExpandableTriggerActions expanded={expanded} onDismiss={onDismiss} />
    </div>
  );
}
