import { useWidgetConfig } from "../contexts/widget-config";
import { useConversation } from "../contexts/conversation";
import { CallButton } from "./CallButton";
import { TriggerLanguageSelect } from "./TriggerLanguageSelect";
import { TriggerMuteButton } from "./TriggerMuteButton";
import { SizeTransition } from "../components/SizeTransition";

export function TriggerActions() {
  const variant = useWidgetConfig().value.variant;
  const { isDisconnected, status } = useConversation();

  return (
    <>
      <CallButton
        isDisconnected={isDisconnected.value}
        iconOnly={variant === "tiny"}
        className="w-full m-1 z-1"
        disabled={
          status.value === "disconnecting" || status.value === "connecting"
        }
      />
      <TriggerLanguageSelect visible={isDisconnected.value} />
      <SizeTransition visible={!isDisconnected.value} className="p-1">
        <TriggerMuteButton />
      </SizeTransition>
    </>
  );
}
