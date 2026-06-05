import { clsx } from "clsx";
import { HTMLAttributes, useState } from "preact/compat";
import { useConversation } from "../contexts/conversation";
import { useComputed, useSignalEffect } from "@preact/signals";
import { InOutTransition } from "../components/InOutTransition";
import { useTextContents } from "../contexts/text-contents";
import { useIsConversationTextOnly } from "../contexts/widget-config";
import { useConversationMode } from "../contexts/conversation-mode";


function userCurrentLabel() {
  const { status, isSpeaking } = useConversation();
  const textOnly = useIsConversationTextOnly();
  const { isTextMode } = useConversationMode();
  const text = useTextContents();

  const compute = () => {
    if (status.value !== "connected") return {label: text.connecting_status.value, updateImmediately: true};

    if (textOnly.value || isTextMode.value) return {label: text.chatting_status.value, updateImmediately: isSpeaking.value};

    if (isSpeaking.value) return {label: text.speaking_status.value, updateImmediately: isSpeaking.value};

    return {label: text.listening_status.value, updateImmediately: isSpeaking.value};
  }
  return useComputed(compute)
}

export function StatusLabel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const currentLabel = userCurrentLabel();
  const [label, setLabel] = useState(currentLabel.peek().label);
  useSignalEffect(() => {
    const label = currentLabel.value;
    if (label.updateImmediately) {
      setLabel(label.label);
    } else {
      const timeout = setTimeout(() => {
        setLabel(label.label);
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
