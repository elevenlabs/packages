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
    // The waiting copy wins over the connected states: while held in the
    // concurrency wait queue the transport is connected but no agent is
    // listening or speaking yet. Compact surfaces (single-line pills) get the
    // short form; spacious ones the full reassurance, wrapped.
    if (isWaitingForAgent.value)
      return compact
        ? {
            label: text.queue_waiting_status_short.value,
            updateImmediately: true,
            wrap: false,
          }
        : {
            label: text.queue_waiting_status.value,
            updateImmediately: true,
            wrap: true,
          };

    if (status.value !== "connected")
      return {
        label: text.connecting_status.value,
        updateImmediately: true,
        wrap: false,
      };

    if (textOnly.value || isTextMode.value)
      return {
        label: text.chatting_status.value,
        updateImmediately: isSpeaking.value,
        wrap: false,
      };

    if (isSpeaking.value)
      return {
        label: text.speaking_status.value,
        updateImmediately: isSpeaking.value,
        wrap: false,
      };

    return {
      label: text.listening_status.value,
      updateImmediately: isSpeaking.value,
      wrap: false,
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
  const [{ label, wrap }, setLabel] = useState(() => {
    const { label, wrap } = currentLabel.peek();
    return { label, wrap };
  });
  useSignalEffect(() => {
    const next = currentLabel.value;
    if (next.updateImmediately) {
      setLabel({ label: next.label, wrap: next.wrap });
    } else {
      const timeout = setTimeout(() => {
        setLabel({ label: next.label, wrap: next.wrap });
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
            // truncate degrades gracefully when a surface caps the label's
            // width (e.g. long custom copy in the trigger): ellipsis instead
            // of spilling past the card edge.
            wrap ? "whitespace-normal max-w-60 text-center" : "truncate"
          )}
        >
          {label}
        </div>
      </InOutTransition>
    </div>
  );
}
