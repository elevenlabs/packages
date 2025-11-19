import {
  KeyboardEventHandler,
  TargetedEvent,
  useCallback,
} from "preact/compat";
import { Signal, useComputed, useSignal } from "@preact/signals";
import { useTextContents } from "../contexts/text-contents";
import { Button } from "../components/Button";
import { useConversation } from "../contexts/conversation";
import {
  useIsConversationTextOnly,
  useWidgetConfig,
} from "../contexts/widget-config";
import { TriggerMuteButton } from "./TriggerMuteButton";
import { CallButton } from "./CallButton";
import { SizeTransition } from "../components/SizeTransition";
import { cn } from "../utils/cn";
import { useSheetContent } from "../contexts/sheet-content";

interface SheetActionsV2Props {
  showTranscript: boolean;
  scrollPinned: Signal<boolean>;
}

export function SheetActionsV2({
  showTranscript,
  scrollPinned,
}: SheetActionsV2Props) {
  const { text_input_enabled } = useWidgetConfig().value;
  const userMessage = useSignal("");
  const isFocused = useSignal(false);
  const textOnly = useIsConversationTextOnly();
  const { isDisconnected, status, startSession, sendUserMessage } =
    useConversation();

  // Determine button visibility based on conversation state
  const showMuteButton = useComputed(() => {
    // Only show mute button when connected and not text-only
    return !textOnly.value && !isDisconnected.value;
  });

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

  return (
    <div className="bg-base flex flex-col gap-2 p-3 w-full shrink-0 relative z-20">
      {text_input_enabled && (
        <div
          className={cn(
            "bg-base flex flex-col rounded-[calc(var(--el-sheet-radius)-8px)] shadow-natural-xs w-full transition-shadow overflow-hidden",
            isFocused.value && "ring-2 ring-accent"
          )}
        >
          <SheetTextarea
            userMessage={userMessage}
            isFocused={isFocused}
            onSendMessage={handleSendMessage}
          />
          <div className="flex gap-1.5 items-center w-full px-3 pb-3 pt-2">
            <SheetButtons
              userMessage={userMessage}
              onSendMessage={handleSendMessage}
            />
          </div>
        </div>
      )}
      {!text_input_enabled && (
        <div className="flex gap-1.5 items-center">
          <SheetButtons
            userMessage={userMessage}
            onSendMessage={handleSendMessage}
            showTranscript={showTranscript}
          />
        </div>
      )}
    </div>
  );
}

function SheetTextarea({
  userMessage,
  isFocused,
  onSendMessage,
}: {
  userMessage: Signal<string>;
  isFocused: Signal<boolean>;
  onSendMessage: (e: TargetedEvent<HTMLElement>) => Promise<void>;
}) {
  const text = useTextContents();
  const textOnly = useIsConversationTextOnly();
  const { isDisconnected, conversationIndex, sendUserActivity } =
    useConversation();

  const handleChange = useCallback(
    (e: TargetedEvent<HTMLTextAreaElement>) => {
      userMessage.value = e.currentTarget.value;
    },
    [userMessage]
  );

  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLTextAreaElement>>(
    async e => {
      if (e.key === "Enter" && !e.shiftKey) {
        await onSendMessage(e);
      }
    },
    [onSendMessage]
  );

  const handleFocus = useCallback(() => {
    isFocused.value = true;
  }, [isFocused]);

  const handleBlur = useCallback(() => {
    isFocused.value = false;
  }, [isFocused]);

  return (
    <textarea
      aria-label={text.input_label}
      value={userMessage.value}
      onInput={sendUserActivity}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={
        textOnly.value
          ? isDisconnected.value && conversationIndex.value > 0
            ? text.input_placeholder_new_conversation.value
            : text.input_placeholder_text_only.value
          : text.input_placeholder.value
      }
      className="w-full resize-none bg-transparent leading-5 border-none outline-none text-sm text-base-primary placeholder:text-base-subtle p-3 min-h-[1lh] max-h-[6lh] [field-sizing:content]"
    />
  );
}

function SheetButtons({
  userMessage,
  onSendMessage,
  showTranscript = false,
}: {
  userMessage: Signal<string>;
  onSendMessage: (e: TargetedEvent<HTMLElement>) => Promise<void>;
  showTranscript?: boolean;
}) {
  const text = useTextContents();
  const textOnly = useIsConversationTextOnly();
  const { text_input_enabled } = useWidgetConfig().value;
  const { isDisconnected, status } = useConversation();

  const showSendButton = useComputed(() => !!userMessage.value.trim());

  const showCallButton = useComputed(() => {
    if (!isDisconnected.value) {
      return true;
    }
    if (!showTranscript && isDisconnected.value && !textOnly.value) {
      return false;
    }
    return !textOnly.value;
  });

  const showSendButtonControl = useComputed(() => {
    return text_input_enabled;
  });

  return (
    <>
      <div className="flex gap-1.5 items-center grow min-w-0">
        <SizeTransition
          visible={!textOnly.value && !isDisconnected.value}
          className="p-1"
        >
          <TriggerMuteButton className="shadow-natural-sm" />
        </SizeTransition>
      </div>
      <SizeTransition visible={showCallButton.value}>
        <CallButton
          iconOnly
          isDisconnected={isDisconnected.value}
          disabled={
            status.value === "disconnecting" || status.value === "connecting"
          }
          className="shadow-natural-sm"
        />
      </SizeTransition>
      {showSendButtonControl.value && (
        <Button
          icon="send"
          onClick={onSendMessage}
          variant="primary"
          disabled={!showSendButton.value}
          className="shadow-natural-sm"
          iconClassName="-rotate-90 text-base"
          aria-label={text.send_message.value}
        />
      )}
    </>
  );
}
