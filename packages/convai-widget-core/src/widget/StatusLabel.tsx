import { clsx } from "clsx";
import { HTMLAttributes, useState } from "preact/compat";
import { useConversation } from "../contexts/conversation";
import { useComputed, useSignalEffect } from "@preact/signals";
import { InOutTransition } from "../components/InOutTransition";
import { useTextContents } from "../contexts/text-contents";
import { useIsConversationTextOnly } from "../contexts/widget-config";
import { useConversationMode } from "../contexts/conversation-mode";

function userCurrentLabel(compact: boolean) {
  const { status, isSpeaking, isWaitingForAgent } = useConversation();
  const textOnly = useIsConversationTextOnly();
  const { isTextMode } = useConversationMode();
  const text = useTextContents();

  const compute = () => {
    // While queued the transport is connected but no agent is present yet,
    // so the waiting copy wins over the connected statuses.
    if (isWaitingForAgent.value)
      return {
        label: compact
          ? text.queue_waiting_status_short.value
          : text.queue_waiting_status.value,
        updateImmediately: true,
      };

    if (status.value !== "connected")
      return {
        label: text.connecting_status.value,
        updateImmediately: true,
      };

    if (textOnly.value || isTextMode.value)
      return {
        label: text.chatting_status.value,
        updateImmediately: isSpeaking.value,
      };

    if (isSpeaking.value)
      return {
        label: text.speaking_status.value,
        updateImmediately: isSpeaking.value,
      };

    return {
      label: text.listening_status.value,
      updateImmediately: isSpeaking.value,
    };
  };
  return useComputed(compute);
}

interface StatusLabelProps extends HTMLAttributes<HTMLDivElement> {
  /** Render single-line copy for cramped surfaces (header pill, trigger). */
  compact?: boolean;
}

export function StatusLabel({
  className,
  compact = false,
  ...props
}: StatusLabelProps) {
  const currentLabel = userCurrentLabel(compact);
  const [{ label }, setLabel] = useState(() => currentLabel.peek());
  useSignalEffect(() => {
    const next = currentLabel.value;
    if (next.updateImmediately) {
      setLabel(next);
    } else {
      const timeout = setTimeout(() => {
        setLabel(next);
      }, 500);
      return () => clearTimeout(timeout);
    }
  });

  return (
    <div
      className={clsx(
        "py-1.5 px-3 bg-base-active overflow-hidden rounded-bubble text-sm",
        className
      )}
      {...props}
    >
      <InOutTransition key={label} initial={false} active={true}>
        <div
          className={clsx(
            "animate-text transition-[opacity,transform] ease-out duration-200 data-hidden:opacity-0 transform data-hidden:translate-y-2",
            compact ? "truncate" : "whitespace-normal max-w-60 text-center"
          )}
        >
          {label}
        </div>
      </InOutTransition>
    </div>
  );
}
