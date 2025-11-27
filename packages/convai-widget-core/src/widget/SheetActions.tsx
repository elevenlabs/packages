import { Signal, useComputed, useSignal } from "@preact/signals";
import {
  KeyboardEventHandler,
  TargetedEvent,
  useCallback,
} from "preact/compat";
import { Button } from "../components/Button";
import { SizeTransition } from "../components/SizeTransition";
import { useConversation } from "../contexts/conversation";
import { useTextContents } from "../contexts/text-contents";
import {
  useIsConversationTextOnly,
  useTextInputEnabled,
} from "../contexts/widget-config";
import { cn } from "../utils/cn";
import { CallButton } from "./CallButton";
import { TriggerMuteButton } from "./TriggerMuteButton";

export function SheetActions({
  showTranscript,
  scrollPinned,
}: {
  showTranscript: boolean;
  scrollPinned: Signal<boolean>;
}) {
  const textInputEnabled = useTextInputEnabled();
  const userMessage = useSignal("");
  const isFocused = useSignal(false);
  const { isDisconnected, startSession, sendUserMessage } = useConversation();

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
    <div className="sticky bottom-0 pointer-events-none z-10 max-h-[50%] flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-4 -translate-y-full bg-gradient-to-t from-base to-transparent pointer-events-none backdrop-blur-[1px] [mask-image:linear-gradient(to_top,black,transparent)] shadow-scroll-fade-top" />
      <div className="relative w-full px-3 pb-3 flex flex-col items-center pointer-events-auto min-h-0">
        {textInputEnabled.value && (
          <div
            className={cn(
              "bg-base relative flex flex-col min-h-0 rounded-[calc(var(--el-sheet-radius)-8px)] border border-base-border w-full transition-shadow overflow-hidden",
              isFocused.value && "ring-2 ring-accent"
            )}
          >
            <SheetTextarea
              userMessage={userMessage}
              isFocused={isFocused}
              onSendMessage={handleSendMessage}
            />
            <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 items-center justify-end px-3 pb-3 pt-2 pointer-events-none">
              <div className="pointer-events-auto flex gap-1.5 items-center">
                <SheetButtons
                  userMessage={userMessage}
                  onSendMessage={handleSendMessage}
                  showTranscript={showTranscript}
                />
              </div>
            </div>
          </div>
        )}
        {!textInputEnabled.value && (
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
      className="w-full h-full resize-none bg-base leading-5 outline-none text-sm text-base-primary placeholder:text-base-subtle p-3 pb-[60px] min-h-[4.5rem] max-h-full [field-sizing:content]"
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
  const textInputEnabled = useTextInputEnabled();
  const { isDisconnected, status } = useConversation();

  const showSendButton = useComputed(() => !!userMessage.value.trim());
  const showSendButtonControl = useComputed(() => {
    return textInputEnabled.value;
  });
  const showCallButton = useComputed(() => {
    // 1. Do not show the call button if text only -> user use text input to initiate
    // 2. Always show the call button for users ends the conversation
    return !isDisconnected.value || (!textOnly.value && showTranscript);
  });
  const showMuteButton = useComputed(() => {
    return !textOnly.value && !isDisconnected.value;
  });

  return (
    <>
      <SizeTransition visible={showMuteButton.value}>
        <TriggerMuteButton className="bg-base text-base-primary hover:bg-base-hover active:bg-base-active" />
      </SizeTransition>
      <SizeTransition visible={showCallButton.value}>
        <CallButton
          iconOnly
          isDisconnected={isDisconnected.value}
          disabled={
            status.value === "disconnecting" || status.value === "connecting"
          }
          className="bg-base text-base-primary hover:bg-base-hover active:bg-base-active"
        />
      </SizeTransition>
      {showSendButtonControl.value && (
        <Button
          icon="send"
          onClick={onSendMessage}
          variant="primary"
          disabled={!showSendButton.value}
          aria-label={text.send_message.value}
        />
      )}
    </>
  );
}
