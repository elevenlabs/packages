import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import { useRef } from "preact/hooks";
import {
  useFirstMessage,
  useIsConversationTextOnly,
  useTextInputEnabled,
  useTextOnly,
  useWidgetConfig,
} from "../contexts/widget-config";
import { useConversation } from "../contexts/conversation";
import {
  buildDisplayTranscript,
  type DisplayTranscriptEntry,
} from "../utils/display-transcript";
import { InOutTransition } from "../components/InOutTransition";
import { cn } from "../utils/cn";
import { Placement } from "../types/config";
import { Transcript } from "./Transcript";
import { FeedbackPage } from "./FeedbackPage";
import { FeedbackActions } from "./FeedbackActions";
import { Signalish, useSignalish } from "../utils/signalish";
import { useConversationMode } from "../contexts/conversation-mode";
import { SheetHeader } from "./SheetHeader";
import { useSheetContent } from "../contexts/sheet-content";
import { useWidgetSize } from "../contexts/widget-size";
import { SheetActions } from "./SheetActions";
import { AvatarOverlay } from "./AvatarOverlay";
import { stripAudioTags } from "../utils/stripAudioTags";

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
  const {
    isDisconnected,
    startSession,
    resumeSession,
    hasStoredSession,
    hasReplayedHistory,
    transcript,
    conversationIndex,
    isAgentTyping,
    isExternalAgentMode,
    isWaitingForAgent,
  } = useConversation();
  const { setMode } = useConversationMode();
  const firstMessage = useFirstMessage();

  // Reconnect a stored persistent conversation when the sheet is opened,
  // including on page load. Only the open transition triggers it, so an
  // inactivity disconnect while the sheet stays open does not reconnect in a
  // loop.
  const openSignal = useSignalish(open);
  const wasOpenRef = useRef(false);
  useSignalEffect(() => {
    const isOpen = openSignal.value;
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;
    if (!isOpen || wasOpen || !isDisconnected.peek() || !hasStoredSession()) {
      return;
    }
    setMode("text");
    void resumeSession();
  });
  const textInputEnabled = useTextInputEnabled();
  const { currentContent, currentConfig } = useSheetContent();
  const { variant } = useWidgetSize();

  const localFirstMessage = useComputed(() => {
    const raw = firstMessage.value;
    if (!raw) return undefined;
    // A replayed transcript already contains the greeting as a stored row.
    if (hasReplayedHistory.value) return undefined;

    // Voice-capable agents write first_message for TTS, so strip its audio tags
    // the way voice bubbles do. Text-only widgets keep them, which the
    // `audio_tags_strip` test relies on.
    const message =
      !textOnly.value && config.value.strip_audio_tags
        ? stripAudioTags(raw)
        : raw;

    if (isConversationTextOnly.value) return message;

    const showFirstMessage =
      isDisconnected.value &&
      config.value.supports_text_only &&
      textInputEnabled.value &&
      transcript.value.every(entry => entry.type !== "message" || entry.isText);

    return showFirstMessage ? message : undefined;
  });

  const filteredTranscript = useComputed<DisplayTranscriptEntry[]>(() => {
    const isTextOnly = textOnly.value || isConversationTextOnly.value;
    const localMessage = localFirstMessage.value;
    return buildDisplayTranscript(transcript.value, {
      showAgentStatus: config.value.show_agent_status ?? false,
      transcriptEnabled:
        isTextOnly || (config.value.transcript_enabled ?? false),
      showRichContent: isTextOnly || localMessage !== undefined,
      firstMessage: localMessage,
      firstMessageConversationIndex: conversationIndex.peek(),
      showTypingIndicator:
        isExternalAgentMode.value &&
        isAgentTyping.value &&
        !isWaitingForAgent.value,
    });
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

  const showExpandButton = useComputed(
    () => showTranscript.value && (config.value.show_resize_button ?? true)
  );

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
