import { useComputed } from "@preact/signals";
import { Avatar } from "../components/Avatar";
import { InOutTransition } from "../components/InOutTransition";
import { useAudioConfig } from "../contexts/audio-config";
import {
  useCallButtonDisabled,
  useConversation,
} from "../contexts/conversation";
import { useLanguageConfig } from "../contexts/language-config";
import { useIsConversationTextOnly } from "../contexts/widget-config";
import { useWidgetSize } from "../contexts/widget-size";
import { cn } from "../utils/cn";
import { CallButton } from "./CallButton";
import { PoweredBy } from "./PoweredBy";
import { Sheet } from "./Sheet";
import { SheetLanguageSelect } from "./SheetLanguageSelect";
import { StatusLabel } from "./StatusLabel";
import { TriggerMuteButton } from "./TriggerMuteButton";

/**
 * Fills the host: a call pane with the avatar beside the chat sheet on desktop,
 * and the sheet alone on mobile or for text-only agents.
 */
export function PageLayout() {
  const { showSpeechPane } = useWidgetSize();

  return (
    <div className="flex w-full h-full bg-base pointer-events-auto">
      {showSpeechPane.value && <SpeechPane />}
      <div
        className={cn(
          "relative flex min-w-0 grow",
          showSpeechPane.value && "basis-2/5 shadow-[0_0_48px_rgba(0,0,0,0.08)]"
        )}
      >
        <Sheet open />
        <div className="absolute inset-x-0 bottom-1 flex justify-center z-2">
          <PoweredBy />
        </div>
      </div>
    </div>
  );
}

function SpeechPane() {
  const { isDisconnected } = useConversation();
  const callDisabled = useCallButtonDisabled();
  const isConversationTextOnly = useIsConversationTextOnly();
  const { isMutingEnabled } = useAudioConfig();
  const { showPicker } = useLanguageConfig();

  const isInCall = useComputed(
    () => !isDisconnected.value && !isConversationTextOnly.value
  );
  // A call's state, or for a text chat that it's with an AI agent
  const showStatus = useComputed(() => !isDisconnected.value);
  // A text chat is ended from the message box, so the orb only carries calls
  const showCallButton = useComputed(
    () => isDisconnected.value || !isConversationTextOnly.value
  );
  const showMute = useComputed(() => isInCall.value && isMutingEnabled.value);
  // The language is fixed once a conversation starts
  const showLanguage = useComputed(
    () => isDisconnected.value && showPicker.value
  );
  const showToolbar = useComputed(() => showMute.value || showLanguage.value);

  return (
    <div
      data-pane="speech"
      className="relative flex items-center justify-center grow basis-3/5 min-w-0 overflow-hidden bg-base-hover"
    >
      <div className="relative">
        <Avatar size="xl" />
        <InOutTransition active={showCallButton}>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 scale-150 p-1 rounded-[calc(var(--el-button-radius)+4px)] bg-base transition-opacity data-hidden:opacity-0">
            <CallButton
              iconOnly
              isDisconnected={isDisconnected.value}
              disabled={callDisabled.value}
            />
          </div>
        </InOutTransition>
        <InOutTransition active={showStatus}>
          <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 translate-y-full w-max transition-opacity data-hidden:opacity-0">
            <StatusLabel />
          </div>
        </InOutTransition>
      </div>
      <InOutTransition active={showToolbar}>
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 rounded-[calc(var(--el-button-radius)+6px)] bg-base shadow-md transition-opacity data-hidden:opacity-0">
          {showMute.value && <TriggerMuteButton />}
          {showLanguage.value && <SheetLanguageSelect />}
        </div>
      </InOutTransition>
    </div>
  );
}
