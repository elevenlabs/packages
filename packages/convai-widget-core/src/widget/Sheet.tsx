import { useComputed, useSignal } from "@preact/signals";
import {
  useFirstMessage,
  useIsConversationTextOnly,
  useTextOnly,
  useWidgetConfig,
} from "../contexts/widget-config";
import { TranscriptEntry, useConversation } from "../contexts/conversation";
import { InOutTransition } from "../components/InOutTransition";
import { cn } from "../utils/cn";
import { Placement } from "../types/config";
import { Transcript } from "./Transcript";
import { FeedbackPage } from "./FeedbackPage";
import { FeedbackActions } from "./FeedbackActions";
import { Signalish } from "../utils/signalish";
import { SheetHeader } from "./SheetHeader";
import { useSheetContent } from "../contexts/sheet-content";
import { useWidgetSize } from "../contexts/widget-size";
import { SheetActions } from "./SheetActions";
import { AvatarOverlay } from "./AvatarOverlay";

interface SheetProps {
  open: Signalish<boolean>;
}

const ORIGIN_CLASSES: Record<Placement, string> = {
  "top-left": "origin-top-left",
  top: "origin-top",
  "top-right": "origin-top-right",
  "bottom-left": "origin-bottom-left",
  "bottom-right": "origin-bottom-right",
  bottom: "origin-bottom",
};

export function Sheet({ open }: SheetProps) {
  const textOnly = useTextOnly();
  const isConversationTextOnly = useIsConversationTextOnly();
  const config = useWidgetConfig();
  const placement = config.value.placement;
  const { isDisconnected, startSession, transcript, conversationIndex } =
    useConversation();
  const firstMessage = useFirstMessage();
  const { currentContent, currentConfig } = useSheetContent();
  const { variant } = useWidgetSize();

  const filteredTranscript = useComputed<TranscriptEntry[]>(() => {
    if (textOnly.value || isConversationTextOnly.value) {
      if (!firstMessage.value || !textOnly.value) {
        return transcript.value;
      }
      // We only show the first message if the widget does not support voice
      // altogether. If the widget supports voice but switched to text-only
      // mode due to user input, we don't show the first message again.
      return [
        {
          type: "message",
          role: "ai",
          message: firstMessage.value,
          isText: true,
          conversationIndex:
            transcript.value[0]?.conversationIndex ?? conversationIndex.peek(),
        },
        ...transcript.value,
      ];
    }

    return config.value.transcript_enabled
      ? transcript.value
      : transcript.value.filter(
          entry => entry.type !== "message" || entry.isText
        );
  });
  const showTranscript = useComputed(
    () =>
      filteredTranscript.value.length > 0 ||
      (!isDisconnected.value && config.value.transcript_enabled)
  );
  const scrollPinned = useSignal(true);
  const showAvatar = useComputed(() => currentContent.value !== "feedback");
  const showStatusLabel = useComputed(
    () => showTranscript.value && !isDisconnected.value
  );

  const showLanguageSelector = useComputed(
    () =>
      currentContent.value !== "feedback" &&
      (!showTranscript.value || isDisconnected.value)
  );

  const showConversationModeToggle = useComputed(
    () =>
      !!config.value.conversation_mode_toggle_enabled &&
      !isConversationTextOnly.value &&
      !isDisconnected.value
  );

  const showExpandButton = useComputed(() => showTranscript.value);

  return (
    <InOutTransition initial={false} active={open}>
      <div
        data-variant={variant.value}
        className={cn(
          "sheet",
          "flex flex-col overflow-hidden absolute bg-base shadow-lg pointer-events-auto z-2",
          "transition-[width,height,max-width,max-height,transform,border-radius,opacity,inset,bottom,top,left,right,margin,padding] duration-200",
          "data-hidden:scale-90 data-hidden:opacity-0",
          ORIGIN_CLASSES[placement],
          placement.startsWith("top")
            ? config.value.always_expanded
              ? "top-0"
              : "top-20"
            : config.value.always_expanded
              ? "bottom-0"
              : "bottom-20"
        )}
      >
        <SheetHeader
          showBackButton={currentConfig.showHeaderBack}
          onBackClick={currentConfig.onHeaderBack}
          showStatusLabel={showStatusLabel}
          showLanguageSelector={showLanguageSelector}
          showConversationModeToggle={showConversationModeToggle}
          showExpandButton={showExpandButton}
        />
        <InOutTransition active={currentContent.value === "transcript"}>
          <div className="grow flex flex-col min-h-0 relative transition-opacity duration-300 ease-out data-hidden:opacity-0">
            <Transcript
              transcript={filteredTranscript}
              scrollPinned={scrollPinned}
            />
            <SheetActions
              showTranscript={showTranscript.value}
              scrollPinned={scrollPinned}
            />
          </div>
        </InOutTransition>
        <InOutTransition active={currentContent.value === "feedback"}>
          <div className="absolute inset-0 top-[88px] flex flex-col bg-base transition-transform duration-300 ease-out data-hidden:translate-x-full">
            <FeedbackPage />
            <FeedbackActions />
          </div>
        </InOutTransition>
        <AvatarOverlay
          showAvatar={showAvatar}
          showTranscript={showTranscript}
          isDisconnected={isDisconnected}
          onStartSession={startSession}
        />
      </div>
    </InOutTransition>
  );
}
