import { useWidgetConfig } from "../contexts/widget-config";
import { useConversation } from "../contexts/conversation";
import { useTextContents } from "../contexts/text-contents";
import { useCallback } from "preact/compat";
import { SizeTransition } from "../components/SizeTransition";
import { CallButton } from "./CallButton";
import { TriggerMuteButton } from "./TriggerMuteButton";
import { Button } from "../components/Button";
import { clsx } from "clsx";
import { ExpandableProps } from "./Trigger";

export function ExpandableTriggerActions({ expanded }: ExpandableProps) {
  const variant = useWidgetConfig().value.variant;
  const { isDisconnected } = useConversation();
  const text = useTextContents();
  const toggleExpanded = useCallback(() => {
    expanded.value = !expanded.value;
  }, [expanded]);

  return (
    <>
      <SizeTransition
        grow={variant !== "tiny"}
        visible={!expanded.value && !isDisconnected.value}
        className="p-1"
      >
        <CallButton iconOnly isDisconnected={false} />
      </SizeTransition>
      <TriggerMuteButton visible={!expanded.value && !isDisconnected.value} />
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
                ? "phone"
                : "chevron-up"
          }
          onClick={
            !expanded.value && !isDisconnected.value
              ? toggleExpanded
              : undefined
          }
        >
          {!expanded.value && isDisconnected.value && variant !== "tiny"
            ? text.start_call
            : undefined}
        </Button>
      </SizeTransition>
    </>
  );
}
