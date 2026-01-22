import { clsx } from "clsx";
import { SizeTransition } from "../components/SizeTransition";
import { Avatar } from "../components/Avatar";
import { ExpandableTriggerActions } from "./ExpandableTriggerActions";
import { ExpandableProps } from "./Trigger";

export function CompactExpandableTrigger({
  expanded,
  className,
  ...rest
}: ExpandableProps) {
  return (
    <div
      className={clsx("rounded-compact-sheet flex items-center p-2", className)}
      {...rest}
    >
      <SizeTransition visible={!expanded.value} className="p-1">
        <Avatar />
      </SizeTransition>
      <ExpandableTriggerActions expanded={expanded} />
    </div>
  );
}
