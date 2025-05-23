import { clsx } from "clsx";
import { HTMLAttributes, useState } from "preact/compat";
import { useConversation } from "../contexts/conversation";
import { useComputed, useSignalEffect } from "@preact/signals";
import { InOutTransition } from "../components/InOutTransition";
import { useTextContents } from "../contexts/text-contents";
import { useIsConversationTextOnly } from "../contexts/widget-config";

export function StatusLabel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { status, isSpeaking } = useConversation();
  const textOnly = useIsConversationTextOnly();
  const text = useTextContents();
  const currentLabel = useComputed(() =>
    status.value !== "connected"
      ? text.connecting_status.value
      : textOnly.value
        ? text.chatting_status.value
        : isSpeaking.value
          ? text.speaking_status.value
          : text.listening_status.value
  );

  const [label, setLabel] = useState(currentLabel.peek());
  useSignalEffect(() => {
    const label = currentLabel.value;
    if (status.value === "connected" && isSpeaking.value) {
      setLabel(label);
    } else {
      const timeout = setTimeout(() => {
        setLabel(label);
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
        <div className="animate-text whitespace-nowrap transition-[opacity,transform] ease-out duration-200 data-hidden:opacity-0 transform data-hidden:translate-y-2">
          {label}
        </div>
      </InOutTransition>
    </div>
  );
}
