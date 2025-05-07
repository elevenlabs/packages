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
              className="bg-gray-200 shrink-0 w-5 h-5 rounded-full"
            />
          )}
          <div
            className={clsx(
              "px-3 py-2.5 rounded-2xl text-sm",
              entry.role === "user"
                ? "bg-foreground text-background"
                : "bg-gray-100 text-foreground"
            )}
          >
            {entry.message}
          </div>
        </div>
      ) : entry.type === "disconnection" ? (
        <div className="mt-2 px-8 text-xs text-subtle text-center transition-opacity duration-200 data-hidden:opacity-0">
          {entry.role === "user"
            ? text.user_ended_conversation
            : text.agent_ended_conversation}
          <br />
          {lastId.value && (
            <span>
              {text.conversation_id}: {lastId.value}
            </span>
          )}
        </div>
      ) : (
        <div className="mt-2 px-8 text-xs text-red-500 text-center transition-opacity duration-200 data-hidden:opacity-0">
          {text.error_occurred}
          <br />
          {entry.message}
          {lastId.value && (
            <>
              <br />
              <span className="text-subtle">
                {text.conversation_id}: {lastId.value}
              </span>
            </>
          )}
        </div>
      )}
    </InOutTransition>
  );
}
