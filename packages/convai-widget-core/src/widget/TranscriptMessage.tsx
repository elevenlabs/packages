import { TranscriptEntry, useConversation } from "../contexts/conversation";
import { InOutTransition } from "../components/InOutTransition";
import { clsx } from "clsx";
import { useAvatarConfig } from "../contexts/avatar-config";
import { useTextContents } from "../contexts/text-contents";

interface TranscriptMessageProps {
  entry: TranscriptEntry;
  animateIn: boolean;
}

export function TranscriptMessage({
  entry,
  animateIn,
}: TranscriptMessageProps) {
  const text = useTextContents();
  const { previewUrl } = useAvatarConfig();
  const { lastId } = useConversation();
  return (
    <InOutTransition initial={!animateIn} active={true}>
      {entry.type === "message" ? (
        <div
          className={clsx(
            "flex gap-2.5 transition-[opacity,transform] duration-200 data-hidden:opacity-0 data-hidden:scale-75",
            entry.role == "user"
              ? "justify-end pl-16 origin-top-right"
              : "pr-16 origin-top-left"
          )}
        >
          {entry.role === "ai" && (
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
      ) : entry.type === "disconnection" ? (
        <div className="mt-2 px-8 text-xs text-base-subtle text-center transition-opacity duration-200 data-hidden:opacity-0">
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
      ) : (
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
      )}
    </InOutTransition>
  );
}
