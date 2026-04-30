import { clsx } from "clsx";
import { Feedback } from "../components/Feedback";
import { Icon } from "../components/Icon";
import { InOutTransition } from "../components/InOutTransition";
import { useAvatarConfig } from "../contexts/avatar-config";
import { useConversation } from "../contexts/conversation";
import {
  ToolCallStatus,
  type DisplayTranscriptEntry,
  type ToolCallStatusType,
} from "../utils/display-transcript";
import { useTextContents } from "../contexts/text-contents";
import {
  useMarkdownLinkConfig,
  useEndFeedbackType,
  useWidgetConfig,
} from "../contexts/widget-config";
import { stripAudioTags } from "../utils/stripAudioTags";
import { WidgetStreamdown } from "../markdown";
import { isImageMimeType } from "./useFileUpload";

interface TranscriptMessageProps {
  entry: DisplayTranscriptEntry;
  animateIn: boolean;
}

function AgentMessageBubble({
  entry,
}: {
  entry: Extract<DisplayTranscriptEntry, { type: "message" }>;
}) {
  const linkConfig = useMarkdownLinkConfig();
  const config = useWidgetConfig();

  const displayMessage =
    config.value.strip_audio_tags && !entry.isText
      ? stripAudioTags(entry.message)
      : entry.message;

  return (
    <div className="pr-8">
      {displayMessage && (
        <WidgetStreamdown linkConfig={linkConfig.value}>
          {displayMessage}
        </WidgetStreamdown>
      )}
      {entry.toolStatus && (
        <div className={displayMessage ? "mt-2" : undefined}>
          <ToolCallMessage status={entry.toolStatus} />
        </div>
      )}
    </div>
  );
}

function UserMessageBubble({
  entry,
}: {
  entry: Extract<DisplayTranscriptEntry, { type: "message" }>;
}) {
  const { previewUrl } = useAvatarConfig();
  const fileInput = entry.fileInput;

  return (
    <div
      className={clsx(
        "flex gap-2.5 transition-[opacity,transform] duration-200 data-hidden:opacity-0 data-hidden:scale-75",
        entry.role === "user"
          ? "justify-end pl-16 origin-top-right"
          : "pr-16 origin-top-left"
      )}
    >
      {entry.role === "agent" && (
        <img
          src={previewUrl}
          alt="AI agent avatar"
          className="bg-base-border shrink-0 w-5 h-5 rounded-full"
        />
      )}
      <div className="flex flex-col items-end gap-1.5 min-w-0">
        {fileInput && (
          <FileAttachment
            fileName={fileInput.fileName}
            mimeType={fileInput.mimeType}
            previewUrl={fileInput.previewUrl}
          />
        )}
        {entry.message && (
          <div
            dir="auto"
            className={clsx(
              "px-3 py-2.5 rounded-bubble text-sm min-w-0 wrap-break-word whitespace-pre-wrap",
              entry.role === "user"
                ? "bg-accent text-accent-primary"
                : "bg-base-active text-base-primary"
            )}
          >
            {entry.message}
          </div>
        )}
      </div>
    </div>
  );
}

function FileAttachment({
  fileName,
  mimeType,
  previewUrl,
}: {
  fileName: string;
  mimeType: string;
  previewUrl: string | null;
}) {
  const isImage = isImageMimeType(mimeType);

  if (isImage && previewUrl) {
    return (
      <div className="rounded-bubble border border-base-border shadow-sm p-1">
        <img
          src={previewUrl}
          alt={fileName}
          className="max-w-[180px] rounded-input object-cover"
        />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-bubble bg-accent text-accent-primary">
      <FileDocIcon />
      <span className="truncate text-sm">{fileName}</span>
    </div>
  );
}

function FileDocIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      className="shrink-0 opacity-70"
    >
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function DisconnectionMessage({
  entry,
}: {
  entry: Extract<DisplayTranscriptEntry, { type: "disconnection" }>;
}) {
  const text = useTextContents();
  const { lastId } = useConversation();
  const endFeedbackType = useEndFeedbackType();
  const config = useWidgetConfig();

  return (
    <div className="px-8 flex flex-col">
      {endFeedbackType.value === "rating" && <Feedback />}
      <div className="text-xs text-base-subtle text-center transition-opacity duration-200 data-hidden:opacity-0">
        {entry.role === "user"
          ? text.user_ended_conversation
          : text.agent_ended_conversation}
        <br />
        {lastId.value && config.value.show_conversation_id && (
          <span className="break-all">
            {text.conversation_id}: {lastId.value}
          </span>
        )}
      </div>
    </div>
  );
}

function ErrorMessage({
  entry,
}: {
  entry: Extract<DisplayTranscriptEntry, { type: "error" }>;
}) {
  const text = useTextContents();
  const { lastId } = useConversation();

  return (
    <div className="px-8 text-xs text-base-error text-center transition-opacity duration-200 data-hidden:opacity-0">
      {text.error_occurred}
      <br />
      {entry.message}
      {lastId.value && (
        <>
          <br />
          <span className="text-base-subtle break-all">
            {text.conversation_id}: {lastId.value}
          </span>
        </>
      )}
    </div>
  );
}

interface ModeToggleMessageProps {
  entry: Extract<DisplayTranscriptEntry, { type: "mode_toggle" }>;
}

function ModeToggleMessage({ entry }: ModeToggleMessageProps) {
  const text = useTextContents();

  return (
    <div className="px-8 text-xs text-base-subtle text-center transition-opacity duration-200 data-hidden:opacity-0">
      {entry.mode === "text"
        ? text.switched_to_text_mode
        : text.switched_to_voice_mode}
    </div>
  );
}

function ToolCallMessage({ status }: { status: ToolCallStatusType }) {
  const text = useTextContents();

  return (
    <div className="-my-4 first:mt-0 last:mb-0 flex items-center">
      <div className="flex items-center h-7 px-2 gap-1 rounded-button border border-base-border bg-base">
        {status === ToolCallStatus.LOADING && (
          <>
            <Icon name="loader" size="md" className="animate-spin shrink-0" />
            <span className="text-xs leading-4">{text.agent_working}</span>
          </>
        )}
        {status === ToolCallStatus.SUCCESS && (
          <InOutTransition active={true} initial={false}>
            <span className="flex items-center gap-1 transition-[opacity,transform] duration-200 data-hidden:opacity-0 data-hidden:scale-75">
              <Icon name="check" size="sm" className="shrink-0" />
              <span className="text-xs leading-4">{text.agent_done}</span>
            </span>
          </InOutTransition>
        )}
        {status === ToolCallStatus.ERROR && (
          <InOutTransition active={true} initial={false}>
            <span className="flex items-center gap-1 transition-[opacity,transform] duration-200 data-hidden:opacity-0 data-hidden:scale-75">
              <Icon name="x" size="sm" className="shrink-0 text-base-error" />
              <span className="text-xs text-base-error leading-4">
                {text.agent_error}
              </span>
            </span>
          </InOutTransition>
        )}
      </div>
    </div>
  );
}

function getMessageComponent(entry: DisplayTranscriptEntry) {
  if (entry.type === "disconnection") {
    return <DisconnectionMessage entry={entry} />;
  }
  if (entry.type === "mode_toggle") {
    return <ModeToggleMessage entry={entry} />;
  }
  if (entry.type === "error") {
    return <ErrorMessage entry={entry} />;
  }
  if (entry.role === "agent") {
    return <AgentMessageBubble entry={entry} />;
  }
  return <UserMessageBubble entry={entry} />;
}

export function TranscriptMessage({
  entry,
  animateIn,
}: TranscriptMessageProps) {
  return (
    <InOutTransition initial={!animateIn} active={true}>
      {getMessageComponent(entry)}
    </InOutTransition>
  );
}
