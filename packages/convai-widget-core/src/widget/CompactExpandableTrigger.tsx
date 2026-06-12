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
      {/* min-h-11 (one control row) keeps the action area from collapsing while
          the entry-point and chevron slots cross-fade, which would bounce the
          trigger height. */}
      <div className="flex items-center min-h-11">
        <ExpandableTriggerActions expanded={expanded} onDismiss={onDismiss} />
      </div>
    </div>
  );
}
