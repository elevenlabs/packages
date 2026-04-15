import {
  ReadonlySignal,
  Signal,
  useComputed,
  useSignal,
} from "@preact/signals";
import {
  KeyboardEventHandler,
  TargetedEvent,
  useCallback,
  useRef,
} from "preact/compat";
import { Button } from "../components/Button";
import { SizeTransition } from "../components/SizeTransition";
import { useConversation } from "../contexts/conversation";
import { useTextContents } from "../contexts/text-contents";
import {
  useFileInputEnabled,
  useFileInputMaxFiles,
  useIsConversationTextOnly,
  useTextInputEnabled,
} from "../contexts/widget-config";
import { cn } from "../utils/cn";
import { CallButton } from "./CallButton";
import { TriggerMuteButton } from "./TriggerMuteButton";
import { useConversationMode } from "../contexts/conversation-mode";
import { UploadFileButton } from "./UploadFileButton";
import { PendingFilePreview } from "./PendingFilePreview";
import { useFileUpload, type PendingFile } from "./useFileUpload";

export function SheetActions({
  showTranscript,
  scrollPinned,
}: {
  showTranscript: boolean;
  scrollPinned: Signal<boolean>;
}) {
  const textInputEnabled = useTextInputEnabled();
  const fileInputEnabled = useFileInputEnabled();
  const maxFiles = useFileInputMaxFiles();
  const userMessage = useSignal("");
  const isFocused = useSignal(false);
  const text = useTextContents();
  const {
    isDisconnected,
    status,
    lastId,
    startSession,
    sendUserMessage,
    sendMultimodalMessage,
  } = useConversation();

  const fileError = useSignal<string | null>(null);
  const fileErrorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversationId = isDisconnected.value ? null : lastId.value;
  const {
    pendingFile,
    isUploading,
    hasReachedLimit,
    addFile,
    removeFile,
    markFileAsSent,
  } = useFileUpload({ conversationId, maxFiles: maxFiles.value });

  const showFileError = useCallback(
    (message: string) => {
      if (fileErrorTimer.current) clearTimeout(fileErrorTimer.current);
      fileError.value = message;
      fileErrorTimer.current = setTimeout(() => {
        fileError.value = null;
      }, 4000);
    },
    [fileError]
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      const error = addFile(file);
      if (error === "unsupported_type") {
        showFileError(text.file_type_unsupported.peek());
      } else if (error === "too_large") {
        showFileError(text.file_too_large.peek());
      } else if (error === "limit_reached") {
        showFileError(text.file_limit_reached.peek());
      } else if (error) {
        showFileError(error);
      }
    },
    [addFile, text, showFileError]
  );

  const handleSendMessage = useCallback(
    async (e: TargetedEvent<HTMLElement>) => {
      e.preventDefault();
      const message = userMessage.value.trim();
      const pending = pendingFile.value;

      if (pending?.status === "ready" && !isDisconnected.value) {
        scrollPinned.value = true;
        sendMultimodalMessage(
          {
            text: message || undefined,
            fileId: pending.fileId,
          },
          {
            fileName: pending.file.name,
            mimeType: pending.file.type,
            previewUrl: pending.previewUrl,
          }
        );
        markFileAsSent();
        userMessage.value = "";
        return;
      }

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
    [
      userMessage,
      scrollPinned,
      isDisconnected,
      startSession,
      sendUserMessage,
      sendMultimodalMessage,
      pendingFile,
      markFileAsSent,
    ]
  );

  const canSend = useComputed(() => {
    const hasText = !!userMessage.value.trim();
    const hasReadyFile = pendingFile.value?.status === "ready";
    return (hasText || hasReadyFile) && !isUploading.value;
  });

  return (
    <div className="sticky bottom-0 pointer-events-none z-10 max-h-[50%] flex flex-col">
      <div className="absolute top-0 left-0 right-0 h-4 -translate-y-full bg-gradient-to-t from-base to-transparent pointer-events-none backdrop-blur-[1px] [mask-image:linear-gradient(to_top,black,transparent)] shadow-scroll-fade-top" />
      <div className="relative w-full px-3 pb-3 flex flex-col items-center pointer-events-auto min-h-0">
        {fileError.value && (
          <div className="w-full px-1 pb-1.5 text-xs text-base-error text-center">
            {fileError.value}
          </div>
        )}
        {textInputEnabled.value && (
          <div
            className={cn(
              "bg-base relative flex flex-col min-h-0 rounded-[calc(var(--el-sheet-radius)-8px)] border border-base-border w-full transition-shadow overflow-hidden",
              isFocused.value && "ring-2 ring-accent"
            )}
          >
            {pendingFile.value && (
              <div className="px-3 pt-3">
                <PendingFilePreview
                  pendingFile={pendingFile.value}
                  onRemove={removeFile}
                />
              </div>
            )}
            <SheetTextarea
              userMessage={userMessage}
              isFocused={isFocused}
              onSendMessage={handleSendMessage}
            />
            <div className="absolute bottom-0 left-0 right-0 flex gap-1.5 items-center justify-end px-3 pb-3 pt-2 pointer-events-none">
              <div className="pointer-events-auto flex gap-1.5 items-center">
                <SheetButtons
                  userMessage={userMessage}
                  canSend={canSend}
                  onSendMessage={handleSendMessage}
                  showTranscript={showTranscript}
                  fileInputEnabled={fileInputEnabled.value}
                  pendingFile={pendingFile}
                  hasReachedLimit={hasReachedLimit}
                  onFileSelect={handleFileSelect}
                />
              </div>
            </div>
          </div>
        )}
        {!textInputEnabled.value && (
          <div className="w-full flex gap-1.5 items-center justify-end">
            <SheetButtons
              userMessage={userMessage}
              canSend={canSend}
              onSendMessage={handleSendMessage}
              showTranscript={showTranscript}
              fileInputEnabled={fileInputEnabled.value}
              pendingFile={pendingFile}
              hasReachedLimit={hasReachedLimit}
              onFileSelect={handleFileSelect}
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
      className="w-full h-full resize-none bg-base leading-5 outline-hidden text-sm text-base-primary placeholder:text-base-subtle p-3 pb-[60px] min-h-18 max-h-full field-sizing-content"
    />
  );
}

function SheetButtons({
  userMessage,
  canSend,
  onSendMessage,
  showTranscript = false,
  fileInputEnabled,
  pendingFile,
  hasReachedLimit,
  onFileSelect,
}: {
  userMessage: Signal<string>;
  canSend: ReadonlySignal<boolean>;
  onSendMessage: (e: TargetedEvent<HTMLElement>) => Promise<void>;
  showTranscript?: boolean;
  fileInputEnabled: boolean;
  pendingFile: ReadonlySignal<PendingFile | null>;
  hasReachedLimit: ReadonlySignal<boolean>;
  onFileSelect: (file: File) => void;
}) {
  const text = useTextContents();
  const textOnly = useIsConversationTextOnly();
  const textInputEnabled = useTextInputEnabled();
  const { isDisconnected, status } = useConversation();
  const { isTextMode } = useConversationMode();

  const showSendButtonControl = useComputed(() => {
    return textInputEnabled.value;
  });
  const showCallButton = useComputed(() => {
    return !isDisconnected.value || (!textOnly.value && showTranscript);
  });
  const showMuteButton = useComputed(() => {
    return !textOnly.value && !isDisconnected.value && !isTextMode.value;
  });
  const showUploadButton = useComputed(() => {
    return fileInputEnabled && !isDisconnected.value;
  });

  return (
    <>
      <SizeTransition visible={showMuteButton.value}>
        <TriggerMuteButton className="bg-base text-base-primary hover:bg-base-hover active:bg-base-active" />
      </SizeTransition>
      <SizeTransition visible={showUploadButton.value}>
        <UploadFileButton
          iconOnly
          hasPendingFile={!!pendingFile.value}
          disabled={hasReachedLimit.value}
          onFileSelect={onFileSelect}
          className="bg-base text-base-primary hover:bg-base-hover active:bg-base-active"
        />
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
          disabled={!canSend.value}
          aria-label={text.send_message.value}
        />
      )}
    </>
  );
}
