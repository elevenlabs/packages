import { clsx } from "clsx";
import { Feedback } from "../components/Feedback";
import { InOutTransition } from "../components/InOutTransition";
import { useAvatarConfig } from "../contexts/avatar-config";
import type { TranscriptEntry } from "../contexts/conversation";
import { useConversation } from "../contexts/conversation";
import { useTextContents } from "../contexts/text-contents";
import { useMarkdownLinkConfig, useEndFeedbackType } from "../contexts/widget-config";
import { WidgetStreamdown } from "../markdown";

interface TranscriptMessageProps {
  entry: TranscriptEntry;
  animateIn: boolean;
}

function AgentMessageBubble({
  entry,
}: {
  entry: Extract<TranscriptEntry, { type: "message" }>;
}) {
  const linkConfig = useMarkdownLinkConfig();
  return (
    <div className="pr-8">
      <WidgetStreamdown linkConfig={linkConfig.value}>
        {entry.message}
      </WidgetStreamdown>
    </div>
  );
}

function UserMessageBubble({
  entry,
}: {
  entry: Extract<TranscriptEntry, { type: "message" }>;
}) {
  const { previewUrl } = useAvatarConfig();

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
      <div
        dir="auto"
        className={clsx(
          "px-3 py-2.5 rounded-bubble text-sm min-w-0 [overflow-wrap:break-word]",
          entry.role === "user"
            ? "bg-accent text-accent-primary"
            : "bg-base-active text-base-primary"
        )}
      >
        {entry.message}
      </div>
    </div>
  );
}

function DisconnectionMessage({
  entry,
}: {
  entry: Extract<TranscriptEntry, { type: "disconnection" }>;
}) {
  const text = useTextContents();
  const { lastId } = useConversation();
  const endFeedbackType = useEndFeedbackType();

  return (
    <div className="mt-3 px-8 flex flex-col">
      {endFeedbackType.value === "rating" && <Feedback />}
      <div className="text-xs text-base-subtle text-center transition-opacity duration-200 data-hidden:opacity-0">
        {entry.role === "user"
          ? text.user_ended_conversation
          : text.agent_ended_conversation}
        <br />
        {lastId.value && (
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
  entry: Extract<TranscriptEntry, { type: "error" }>;
}) {
  const text = useTextContents();
  const { lastId } = useConversation();

  return (
    <div className="mt-2 px-8 text-xs text-base-error text-center transition-opacity duration-200 data-hidden:opacity-0">
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
  entry: Extract<TranscriptEntry, { type: "mode_toggle" }>;
}

function ModeToggleMessage({ entry }: ModeToggleMessageProps) {
  const text = useTextContents();

  return (
    <div className="mt-2 px-8 text-xs text-base-subtle text-center transition-opacity duration-200 data-hidden:opacity-0">
      {entry.mode === "text"
        ? text.switched_to_text_mode
        : text.switched_to_voice_mode}
    </div>
  );
}

function getMessageComponent(entry: TranscriptEntry, isStreaming?: boolean) {
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
