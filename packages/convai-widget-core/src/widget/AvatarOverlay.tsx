import { ReadonlySignal, useComputed } from "@preact/signals";
import { cn } from "../utils/cn";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { InOutTransition } from "../components/InOutTransition";
import { StatusLabel } from "./StatusLabel";
import { useTextContents } from "../contexts/text-contents";
import { useTextOnly, useTextInputEnabled } from "../contexts/widget-config";

export function AvatarOverlay({
  showAvatar,
  showTranscript,
  isDisconnected,
  onStartSession,
}: {
  showAvatar: ReadonlySignal<boolean>;
  showTranscript: ReadonlySignal<boolean>;
  isDisconnected: ReadonlySignal<boolean>;
  onStartSession: (element: HTMLElement) => void;
}) {
  const text = useTextContents();
  const textInputEnabled = useTextInputEnabled();
  const textOnly = useTextOnly();

  const containerClassName = useComputed(() =>
    cn(
      "absolute origin-top-left transition-[transform,left,top,opacity,scale] duration-200 z-10",
      "data-hidden:opacity-0",
      showTranscript.value
        ? "top-4 left-4 scale-[0.1667]"
        : textInputEnabled.value
          ? "top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100"
          : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100"
    )
  );

  const showStartCallButton = useComputed(
    () => !showTranscript.value && isDisconnected.value && !textOnly.value
  );

  const showStatusLabel = useComputed(
    () => !showTranscript.value && !isDisconnected.value
  );

  return (
    <InOutTransition active={showAvatar}>
      <div className={containerClassName}>
        <Avatar size="lg" />
        <InOutTransition active={showStartCallButton}>
          <div className="absolute bottom-0 p-1 rounded-[calc(var(--el-button-radius)+4px)] bg-base left-1/2 -translate-x-1/2 translate-y-1/2 transition-[opacity,transform] data-hidden:opacity-0 data-hidden:scale-100 scale-150">
            <Button
              aria-label={text.start_call}
              variant="primary"
              icon="phone"
              onClick={e => onStartSession(e.currentTarget)}
            />
          </div>
        </InOutTransition>
        <InOutTransition active={showStatusLabel}>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 translate-y-full transition-[opacity,transform] data-hidden:opacity-0 data-hidden:scale-75">
            <StatusLabel />
          </div>
        </InOutTransition>
      </div>
    </InOutTransition>
  );
}
