import { HTMLAttributes } from "preact/compat";
import { useConversation } from "../contexts/conversation";
import { useTextContents } from "../contexts/text-contents";
import { clsx } from "clsx";
import { Avatar } from "../components/Avatar";
import { InOutTransition } from "../components/InOutTransition";
import { TriggerActions } from "./TriggerActions";
import { StatusLabel } from "./StatusLabel";

export function FullTrigger({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  const { isDisconnected } = useConversation();
  const text = useTextContents();

  return (
    <div className={clsx("flex flex-col p-2 rounded-sheet", className)} {...rest}>
      <div className="flex items-center p-1 gap-2 min-w-60">
        <Avatar />
        <div className="relative text-sm max-w-64">
          <span
            className={clsx(
              "block transition-[transform,opacity] duration-200",
              !isDisconnected.value && "opacity-0 scale-90"
            )}
          >
            {text.main_label}
          </span>
          <InOutTransition active={!isDisconnected.value}>
            <StatusLabel className="absolute top-1/2 -translate-y-1/2 transition-[transform,opacity] duration-200 data-hidden:opacity-0 data-hidden:scale-90" />
          </InOutTransition>
        </div>
      </div>
      <div className="flex items-center">
        <TriggerActions />
      </div>
    </div>
  );
}
