import { HTMLAttributes } from "preact/compat";
import { clsx } from "clsx";
import { Avatar } from "../components/Avatar";
import { TriggerActions } from "./TriggerActions";

export function CompactTrigger({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx("rounded-compact-sheet flex items-center p-2", className)}
      {...rest}
    >
      <Avatar className="mx-1" />
      <TriggerActions />
    </div>
  );
}
