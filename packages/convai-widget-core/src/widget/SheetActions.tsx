import { useState } from "preact/compat";
import { useConversation } from "../contexts/conversation";
import { TextArea } from "../components/TextArea";
import { TriggerMuteButton } from "./TriggerMuteButton";
import { SizeTransition } from "../components/SizeTransition";
import { CallButton } from "./CallButton";
import { Signal } from "@preact/signals";
import {
  useIsConversationTextOnly,
  useWidgetConfig,
} from "../contexts/widget-config";
import { useTextContents } from "../contexts/text-contents";

interface SheetActionsProps {
  showTranscript: boolean;
  scrollPinned: Signal<boolean>;
}

export function SheetActions({
  showTranscript,
  scrollPinned,
}: SheetActionsProps) {
  const [userMessage, setUserMessage] = useState("");
  const textOnly = useIsConversationTextOnly();
  const { text_input_enabled } = useWidgetConfig().value;
  const text = useTextContents();
  const {
    isDisconnected,
    status,
    startSession,
    sendUserMessage,
    sendUserActivity,
    conversationIndex,
  } = useConversation();

  return (
    <div className="shrink-0 overflow-hidden flex p-3 items-end justify-end">
      {text_input_enabled && (
        <TextArea
          rows={1}
          aria-label={text.input_label}
          value={userMessage}
          onInput={sendUserActivity}
          onChange={e => setUserMessage(e.currentTarget.value)}
          onKeyDown={async e => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (userMessage.trim()) {
                scrollPinned.value = true;
                setUserMessage("");
                if (isDisconnected.value) {
                  await startSession(e.currentTarget, userMessage);
                } else {
                  sendUserMessage(userMessage);
                }
              }
            }
          }}
          className="m-1 grow z-1 max-h-[8lh]"
          placeholder={
            textOnly.value
              ? isDisconnected.value && conversationIndex.value > 0
                ? text.input_placeholder_new_conversation
                : text.input_placeholder_text_only
              : text.input_placeholder
          }
        />
      )}
      <div className="flex h-11 items-center">
        <TriggerMuteButton visible={!textOnly.value && !isDisconnected.value} />
        <SizeTransition
          visible={!textOnly.value && (!isDisconnected.value || showTranscript)}
          className="p-1"
        >
          <CallButton
            iconOnly={!isDisconnected.value}
            isDisconnected={isDisconnected.value}
            disabled={
              status.value === "disconnecting" || status.value === "connecting"
            }
          >
            {text.new_call}
          </CallButton>
        </SizeTransition>
      </div>
    </div>
  );
}
