import { ReadonlySignal } from "@preact/signals";
import { useConversationMode } from "../contexts/conversation-mode";
import { Icon, IconName } from "../components/Icon";
import { useTextContents } from "../contexts/text-contents";
import { useWidgetSize } from "../contexts/widget-size";
import { cn } from "../utils/cn";

export function ConversationModeToggle({ className }: { className?: string }) {
  const text = useTextContents();
  const { mode, setMode } = useConversationMode();
  const { variant } = useWidgetSize();
  const compact = variant.value === "compact";

  return (
    <div
      role="group"
      className={cn(
        "flex items-center p-0.5 rounded-full border border-base-border bg-base",
        className
      )}
    >
      <ModeSegment
        icon="soundwave"
        label={text.voice_mode_label}
        active={mode.value === "voice"}
        compact={compact}
        onClick={() => setMode("voice")}
      />
      <ModeSegment
        icon="chat"
        label={text.text_mode_label}
        active={mode.value === "text"}
        compact={compact}
        onClick={() => setMode("text")}
      />
    </div>
  );
}

interface ModeSegmentProps {
  icon: IconName;
  label: ReadonlySignal<string>;
  active: boolean;
  compact: boolean;
  onClick: () => void;
}

function ModeSegment({
  icon,
  label,
  active,
  compact,
  onClick,
}: ModeSegmentProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex items-center rounded-full text-sm font-medium select-none transition-colors duration-200 focus-ring",
        compact ? "justify-center h-8 w-10" : "gap-1.5 h-7 px-3",
        active
          ? "bg-accent text-accent-primary"
          : "text-base-subtle hover:bg-base-hover hover:text-base-primary active:bg-base-active"
      )}
    >
      <Icon name={icon} size={compact ? "sm" : "xs"} />
      <span className={cn(compact && "sr-only")}>{label}</span>
    </button>
  );
}
