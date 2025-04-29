import { clsx } from "clsx";
import { HTMLAttributes, useState } from "preact/compat";
import { useConversation } from "../contexts/conversation";
import { useSignalEffect } from "@preact/signals";
import { InOutTransition } from "../components/InOutTransition";

export function StatusLabel({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const { status, isSpeaking } = useConversation();
  const [label, setLabel] = useState("Connecting");
  useSignalEffect(() => {
    const label =
      status.value !== "connected"
        ? "Connecting"
        : isSpeaking.value
          ? "Speak to interrupt"
          : "Listening";

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
        "py-1.5 px-3 bg-gray-100 overflow-hidden rounded-2xl text-sm",
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
