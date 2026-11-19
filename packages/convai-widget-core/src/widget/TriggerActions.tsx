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
import { useTextContents } from "../contexts/text-contents";

interface TriggerActionsProps {
  onDismiss?: () => void;
}

export function TriggerActions({ onDismiss }: TriggerActionsProps) {
  const config = useWidgetConfig();
  const variant = config.value.variant;
  const { isDisconnected, pendingNavigationResume, continueNavigationCall } =
    useConversation();
  const callDisabled = useCallButtonDisabled();
  const text = useTextContents();
  // Without a transcript to show the offer in, the call button takes it.
  const offersResume = isDisconnected.value && !!pendingNavigationResume.value;
  const showTriggerLanguageSelector =
    isDisconnected.value &&
    (config.value.show_language_selector_on_trigger ?? true);

  return (
    <>
      <CallButton
        isDisconnected={isDisconnected.value}
        iconOnly={variant === "tiny"}
        className="w-full m-1 z-1"
        disabled={callDisabled.value}
        {...(offersResume && {
          "aria-label": text.resume_call,
          onClick: e => void continueNavigationCall(e.currentTarget),
          children: text.resume_call,
        })}
      />
      <TriggerLanguageSelect visible={showTriggerLanguageSelector} />
      <SizeTransition visible={!isDisconnected.value} className="p-1">
        <TriggerMuteButton />
      </SizeTransition>
      <SizeTransition visible={!!onDismiss} className="p-1">
        <DismissButton onDismiss={onDismiss} />
      </SizeTransition>
    </>
  );
}
