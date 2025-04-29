import { useConversation } from "../contexts/conversation";
import { useTextContents } from "../contexts/text-contents";
import { clsx } from "clsx";
import { SizeTransition } from "../components/SizeTransition";
import { Avatar } from "../components/Avatar";
import { ExpandableTriggerActions } from "./ExpandableTriggerActions";
import { ExpandableProps } from "./Trigger";

export function FullExpandableTrigger({
  expanded,
  className,
  ...rest
}: ExpandableProps) {
  const { isDisconnected } = useConversation();
  const text = useTextContents();

  return (
    <div
      className={clsx(
        "transition-[border-radius] flex flex-col p-2",
        !expanded.value && isDisconnected.value
          ? "rounded-3xl"
          : "rounded-[30px]",
        className
      )}
      {...rest}
    >
      <SizeTransition
        visible={!expanded.value && isDisconnected.value}
        className="p-1"
      >
        <div className="flex items-center px-1 gap-2">
          <Avatar />
          <div className="text-sm max-w-64">{text.action_text}</div>
        </div>
      </SizeTransition>
      <div className="flex items-center">
        <ExpandableTriggerActions expanded={expanded} />
      </div>
    </div>
  );
}
