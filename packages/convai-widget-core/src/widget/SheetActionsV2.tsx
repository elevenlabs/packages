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
    <div className="absolute inset-x-0 bottom-0 pointer-events-none z-10">
      <div className="absolute bottom-0 left-4 right-4 h-14 bg-base" />
      <div className="relative w-full px-3 pb-3 flex flex-col items-center pointer-events-auto">
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
            <div className="w-full flex gap-1.5 items-center justify-end px-3 pb-3 pt-2">
              <SheetButtons
                userMessage={userMessage}
                onSendMessage={handleSendMessage}
                showTranscript={showTranscript}
              />
            </div>
          </div>
        )}
        {!text_input_enabled && (
          <div className="w-full flex gap-1.5 items-center justify-end">
            <SheetButtons
              userMessage={userMessage}
              onSendMessage={handleSendMessage}
              showTranscript={showTranscript}
            />
          </div>
        )}
      </div>
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
      className="w-full resize-none bg-base leading-5 border-none outline-none text-sm text-base-primary placeholder:text-base-subtle p-3 min-h-[1lh] max-h-[6lh] [field-sizing:content]"
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

  const showSendButtonControl = useComputed(() => {
    return text_input_enabled;
  });

  return (
    <>
      <SizeTransition
        visible={!textOnly.value && !isDisconnected.value}
        className="p-1"
      >
        <TriggerMuteButton className="shadow-natural-sm !border-0 !bg-base !text-base-primary hover:!bg-base-hover active:!bg-base-active" />
      </SizeTransition>
      <SizeTransition visible={!isDisconnected.value || showTranscript}>
        <CallButton
          iconOnly
          isDisconnected={isDisconnected.value}
          disabled={
            status.value === "disconnecting" || status.value === "connecting"
          }
          className="shadow-natural-sm !border-0 !bg-base !text-base-primary hover:!bg-base-hover active:!bg-base-active"
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
