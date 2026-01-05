import {
  KeyboardEventHandler,
  TargetedEvent,
  useCallback,
} from "preact/compat";
import { useConversation } from "../contexts/conversation";
import { TextArea } from "../components/TextArea";
import { TriggerMuteButton } from "./TriggerMuteButton";
import { ModeToggleButton } from "./ModeToggleButton";
import { SizeTransition } from "../components/SizeTransition";
import { CallButton } from "./CallButton";
import { Signal, useComputed, useSignal } from "@preact/signals";
import {
  useIsConversationTextOnly,
  useWidgetConfig,
} from "../contexts/widget-config";
import { useTextContents } from "../contexts/text-contents";
import { Icon } from "../components/Icon";
import { InOutTransition } from "../components/InOutTransition";

interface SheetActionsProps {
  showTranscript: boolean;
  scrollPinned: Signal<boolean>;
}

export function SheetActions({
  showTranscript,
  scrollPinned,
}: SheetActionsProps) {
  const userMessage = useSignal("");
  const textOnly = useIsConversationTextOnly();
  const widgetConfig = useWidgetConfig();
  const { text_input_enabled } = widgetConfig.value;
  const text = useTextContents();
  const {
    isDisconnected,
    status,
    startSession,
    sendUserMessage,
    sendUserActivity,
    conversationIndex,
  } = useConversation();

  const handleSendMessage = useCallback(
    async (e: TargetedEvent<HTMLElement>) => {
      e.preventDefault();
      const message = userMessage.value.trim();
      if (message) {
        scrollPinned.value = true;
        userMessage.value = "";
        if (isDisconnected.value) {
          await startSession(e.currentTarget, message);
        } else {
          sendUserMessage(message);
        }
      }
    },
    [userMessage, scrollPinned, isDisconnected, startSession, sendUserMessage]
  );

  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLTextAreaElement>>(
    async e => {
      if (e.key === "Enter" && !e.shiftKey) {
        await handleSendMessage(e);
      }
    },
    [handleSendMessage]
  );

  const handleChange = useCallback(
    (e: TargetedEvent<HTMLTextAreaElement>) => {
      userMessage.value = e.currentTarget.value;
    },
    [userMessage]
  );

  const showSendButton = useComputed(() => !!userMessage.value.trim());

  return (
    <div className="shrink-0 overflow-hidden flex p-3 items-end justify-end">
      {text_input_enabled && (
        <div className="relative grow min-w-0 flex z-1 m-1">
          <TextArea
            rows={1}
            aria-label={text.input_label}
            value={userMessage}
            onInput={sendUserActivity}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="min-w-0 w-full max-h-[8lh] pr-9"
            placeholder={
              textOnly.value
                ? isDisconnected.value && conversationIndex.value > 0
                  ? text.input_placeholder_new_conversation
                  : text.input_placeholder_text_only
                : text.input_placeholder
            }
          />
          <InOutTransition active={showSendButton}>
            <button
              aria-label={text.send_message}
              className="absolute right-1 bottom-1 w-7 h-7 flex items-center justify-center hover:bg-base-hover active:bg-base-active rounded-button focus-ring transition-[transform,opacity] duration-200 data-hidden:opacity-0 data-hidden:scale-90"
              onClick={handleSendMessage}
            >
              <Icon name="send" />
            </button>
          </InOutTransition>
        </div>
      )}
      <div className="flex h-11 items-center gap-1">
        <TriggerMuteButton visible={!textOnly.value && !isDisconnected.value} />
        <ModeToggleButton visible={!isDisconnected.value && widgetConfig.value.supports_text_only} />
        <SizeTransition
          visible={!isDisconnected.value || showTranscript}
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
