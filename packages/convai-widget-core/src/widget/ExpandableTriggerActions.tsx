import {
  useIsConversationTextOnly,
  useWidgetConfig,
} from "../contexts/widget-config";
import { useConversation } from "../contexts/conversation";
import { useTextContents } from "../contexts/text-contents";
import { useCallback } from "preact/compat";
import { SizeTransition } from "../components/SizeTransition";
import { CallButton } from "./CallButton";
import { TriggerMuteButton } from "./TriggerMuteButton";
import { Button } from "../components/Button";
import { clsx } from "clsx";
import { ExpandableProps } from "./Trigger";
import { Avatar } from "../components/Avatar";

export function ExpandableTriggerActions({ expanded }: ExpandableProps) {
  const textOnly = useIsConversationTextOnly();
  const variant = useWidgetConfig().value.variant;
  const { isDisconnected } = useConversation();
  const text = useTextContents();
  const toggleExpanded = useCallback(() => {
    expanded.value = !expanded.value;
  }, [expanded]);

  return (
    <>
      {variant === "full" && (
        <SizeTransition
          visible={!expanded.value && !isDisconnected.value}
          className="p-1"
        >
          <Avatar />
        </SizeTransition>
      )}
      <SizeTransition
        grow={variant !== "tiny"}
        visible={!textOnly.value && !expanded.value && !isDisconnected.value}
        className="p-1"
      >
        <CallButton iconOnly isDisconnected={false} />
      </SizeTransition>
      <TriggerMuteButton
        visible={!textOnly.value && !expanded.value && !isDisconnected.value}
      />
      <SizeTransition grow={isDisconnected.value} visible className="p-1">
        <Button
          className="w-full"
          variant="primary"
          iconClassName={clsx(
            (expanded.value || !isDisconnected.value) &&
              "transition-transform duration-200",
            expanded.value && "-rotate-180"
          )}
          icon={
            expanded.value
              ? "chevron-up"
              : isDisconnected.value
                ? textOnly.value
                  ? "chat"
                  : "phone"
                : "chevron-up"
          }
          aria-label={
            expanded.value
              ? text.collapse
              : isDisconnected.value
                ? textOnly.value
                  ? text.start_chat
                  : text.start_call
                : text.expand
          }
          onClick={
            !expanded.value && !isDisconnected.value
              ? toggleExpanded
              : undefined
          }
        >
          {!expanded.value && isDisconnected.value && variant !== "tiny"
            ? textOnly.value
              ? text.start_chat
              : text.start_call
            : undefined}
        </Button>
      </SizeTransition>
    </>
  );
}
