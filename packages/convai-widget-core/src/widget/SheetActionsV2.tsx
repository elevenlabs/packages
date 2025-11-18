import { TargetedEvent, useCallback } from "preact/compat";
import { useSignal } from "@preact/signals";
import { useTextContents } from "../contexts/text-contents";
import { Button } from "../components/Button";

interface SheetActionsV2Props {
  onAttachmentClick?: () => void;
  onPhoneClick?: () => void;
  onSendClick?: () => void;
  showAttachment?: boolean;
  showCall?: boolean;
}

export function SheetActionsV2({
  onAttachmentClick = () => {},
  onPhoneClick = () => {},
  onSendClick = () => {},
  showAttachment = true,
  showCall = true,
}: SheetActionsV2Props) {
  const text = useTextContents();
  const userMessage = useSignal("");
  const isFocused = useSignal(false);

  const handleChange = useCallback(
    (e: TargetedEvent<HTMLTextAreaElement>) => {
      userMessage.value = e.currentTarget.value;
    },
    [userMessage]
  );

  const handleSendMessage = useCallback(() => {
    const message = userMessage.value.trim();
    if (message) {
      userMessage.value = "";
      onSendClick();
    }
  }, [userMessage, onSendClick]);

  const handleFocus = useCallback(() => {
    isFocused.value = true;
  }, [isFocused]);

  const handleBlur = useCallback(() => {
    isFocused.value = false;
  }, [isFocused]);

  return (
    <div className="bg-base flex flex-col px-2 pt-1 pb-2 w-full shrink-0 relative z-20">
      <div
        className={`bg-base flex flex-col gap-2 items-center justify-end p-3 rounded-[calc(var(--el-sheet-radius)-8px)] shadow-natural-xs w-full transition-shadow ${
          isFocused.value ? "ring-2 ring-accent" : ""
        }`}
      >
        <div className="relative w-full max-h-[68px] overflow-y-auto">
          <textarea
            rows={1}
            aria-label={text.input_label}
            value={userMessage.value}
            onInput={handleChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={text.input_placeholder.value}
            className="w-full resize-none bg-transparent border-none outline-none leading-5 text-sm text-base-primary placeholder:text-base-subtle pb-1.5 pt-1 px-1.5 [field-sizing:content] max-h-[68px]"
          />
        </div>
        <div className="flex gap-1.5 items-center w-full">
          <div className="flex-1 flex gap-1.5 items-center">
            {showAttachment && (
              <Button
                icon="paperclip"
                onClick={onAttachmentClick}
                variant="secondary"
                className="!rounded-full shadow-natural-sm !w-10 !h-10 !min-w-10 !px-0 border-0"
                aria-label="Attach file"
              />
            )}
          </div>
          {showCall && (
            <Button
              icon="phone"
              onClick={onPhoneClick}
              variant="secondary"
              className="!rounded-full shadow-natural-sm !w-10 !h-10 !min-w-10 !px-0 border-0"
              aria-label={text.start_call.value}
            />
          )}
          <Button
            icon="send"
            onClick={handleSendMessage}
            variant="primary"
            className="!rounded-full shadow-natural-sm !w-10 !h-10 !min-w-10 !px-0 !bg-base-primary !border-base-primary opacity-50 hover:opacity-60 active:opacity-70 !transition-opacity"
            iconClassName="-rotate-90 !text-base"
            aria-label={text.send_message.value}
          />
        </div>
      </div>
    </div>
  );
}

