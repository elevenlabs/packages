import { HTMLAttributes } from "preact/compat";
import { useConversation } from "../contexts/conversation";
import { useTextContents } from "../contexts/text-contents";
import { clsx } from "clsx";
import { Avatar } from "../components/Avatar";
import { InOutTransition } from "../components/InOutTransition";
import { TriggerActions } from "./TriggerActions";
import { StatusLabel } from "./StatusLabel";

interface FullTriggerProps extends HTMLAttributes<HTMLDivElement> {
  onDismiss?: () => void;
}

export function FullTrigger({
  className,
  onDismiss,
  ...rest
}: FullTriggerProps) {
  const { isDisconnected } = useConversation();
  const text = useTextContents();

  return (
    <div
      className={clsx("flex flex-col p-2 rounded-sheet", className)}
      {...rest}
    >
      <div className="flex items-center p-1 gap-2 min-w-60">
        <Avatar />
        {/* Both labels share one grid cell so the wider of the two sizes the
            trigger — an absolutely positioned status label would not affect
            layout and long copy (the queue waiting status) would get clipped
            at the card edge. */}
        <div className="grid items-center text-sm max-w-64">
          <span
            className={clsx(
              "col-start-1 row-start-1 transition-[transform,opacity] duration-200",
              !isDisconnected.value && "opacity-0 scale-90"
            )}
          >
            {text.main_label}
          </span>
          <InOutTransition active={!isDisconnected.value}>
            <StatusLabel
              compact
              className="col-start-1 row-start-1 justify-self-start max-w-full transition-[transform,opacity] duration-200 data-hidden:opacity-0 data-hidden:scale-90"
            />
          </InOutTransition>
        </div>
      </div>
      <div className="flex items-center">
        <TriggerActions onDismiss={onDismiss} />
      </div>
    </div>
  );
}
