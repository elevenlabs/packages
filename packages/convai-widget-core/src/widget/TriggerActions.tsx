import { useWidgetConfig } from "../contexts/widget-config";
import {
  useCallButtonDisabled,
  useConversation,
} from "../contexts/conversation";
import { CallButton } from "./CallButton";
import { TriggerLanguageSelect } from "./TriggerLanguageSelect";
import { TriggerMuteButton } from "./TriggerMuteButton";
import { SizeTransition } from "../components/SizeTransition";
import { DismissButton } from "../components/DismissButton";

interface TriggerActionsProps {
  onDismiss?: () => void;
}

export function TriggerActions({ onDismiss }: TriggerActionsProps) {
  const variant = useWidgetConfig().value.variant;
  const { isDisconnected } = useConversation();
  const callDisabled = useCallButtonDisabled();

  return (
    <>
      <CallButton
        isDisconnected={isDisconnected.value}
        iconOnly={variant === "tiny"}
        className="w-full m-1 z-1"
        disabled={callDisabled.value}
      />
      <TriggerLanguageSelect visible={isDisconnected.value} />
      <SizeTransition visible={!isDisconnected.value} className="p-1">
        <TriggerMuteButton />
      </SizeTransition>
      <SizeTransition visible={!!onDismiss} className="p-1">
        <DismissButton onDismiss={onDismiss} />
      </SizeTransition>
    </>
  );
}
