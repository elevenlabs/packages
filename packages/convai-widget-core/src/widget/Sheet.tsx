import { useComputed, useSignal } from "@preact/signals";
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
import { SheetHeader } from "./SheetHeader";
import { useSheetContent } from "../contexts/sheet-content";
import { useWidgetSize } from "../contexts/widget-size";
import { SheetActions } from "./SheetActions";
import { AvatarOverlay } from "./AvatarOverlay";
import { stripAudioTags } from "../utils/stripAudioTags";
import { useEndConfirmation } from "../contexts/end-confirmation";
import { EndConfirmationDialog } from "./EndConfirmationDialog";
import { usePersistentSessionLifecycle } from "../utils/usePersistentSessionLifecycle";
import { useExpandForCarousels } from "../utils/useExpandForCarousels";

interface SheetProps {
  open: Signalish<boolean>;
  onClose?: () => void;
}

const ORIGIN_CLASSES: Record<Placement, string> = {
  "top-left": "origin-top-left",
  top: "origin-top",
  "top-right": "origin-top-right",
  "bottom-left": "origin-bottom-left",
  "bottom-right": "origin-bottom-right",
  bottom: "origin-bottom",
};

export function Sheet({ open, onClose }: SheetProps) {
  const textOnly = useTextOnly();
  const isConversationTextOnly = useIsConversationTextOnly();
  const config = useWidgetConfig();
  const placement = config.value.placement;
  const {
    isDisconnected,
    startSession,
    isResumedSession,
    transcript,
    conversationIndex,
    isAgentTyping,
    isAwaitingReply,
    isAgentThinking,
    isExternalAgentMode,
    isWaitingForAgent,
  } = useConversation();
  const firstMessage = useFirstMessage();

  const openSignal = useSignalish(open);
  usePersistentSessionLifecycle(openSignal);
  const textInputEnabled = useTextInputEnabled();
  const { currentContent, currentConfig } = useSheetContent();
  const { variant, showSpeechPane } = useWidgetSize();
  const { confirmationShown } = useEndConfirmation();

  const localFirstMessage = useComputed(() => {
    const raw = firstMessage.value;
    if (!raw) return undefined;
    // A replayed transcript already contains the greeting as a stored row.
    if (isResumedSession.value) return undefined;

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
      transcript.value.every(
        entry => entry.type !== "message" || entry.isText
      );

    return showFirstMessage ? message : undefined;
  });

  const filteredTranscript = useComputed<DisplayTranscriptEntry[]>(() => {
    const isTextOnly = textOnly.value || isConversationTextOnly.value;
    const localMessage = localFirstMessage.value;
    const transcriptEnabled =
      isTextOnly || (config.value.transcript_enabled ?? false);
    return buildDisplayTranscript(transcript.value, {
      showAgentStatus: config.value.show_agent_status ?? false,
      transcriptEnabled,
      showRichContent: transcriptEnabled || localMessage !== undefined,
      firstMessage: localMessage,
      firstMessageConversationIndex: conversationIndex.peek(),
      deferFirstMessageRichContent: !!firstMessage.value && !localMessage,
      showTypingIndicator:
        isExternalAgentMode.value &&
        isAgentTyping.value &&
        !isWaitingForAgent.value,
      showAgentReplyPending:
        (isTextOnly ? isAwaitingReply.value : isAgentThinking.value) &&
        !isExternalAgentMode.value &&
        !isWaitingForAgent.value,
    });
  });
  useExpandForCarousels(filteredTranscript);
  const showTranscript = useComputed(
    () =>
      filteredTranscript.value.length > 0 ||
      (!isDisconnected.value && config.value.transcript_enabled)
  );
  const scrollPinned = useSignal(true);
  // The page layout's speech pane shows the avatar beside the sheet instead
  const showAvatar = useComputed(
    () => currentContent.value !== "feedback" && !showSpeechPane.value
  );
  // Beside the call pane, the conversation's state shows under its orb
  const showStatusLabel = useComputed(
    () =>
      showTranscript.value && !isDisconnected.value && !showSpeechPane.value
  );

  const showLanguageSelector = useComputed(
    () =>
      currentContent.value !== "feedback" &&
      !showSpeechPane.value &&
      (!showTranscript.value || isDisconnected.value)
  );

  const showConversationModeToggle = useComputed(
    () =>
      !!config.value.conversation_mode_toggle_enabled &&
      !isConversationTextOnly.value &&
      !isDisconnected.value
  );

  // Beside the call pane the header would be empty, unless it holds the mode
  // toggle or the feedback page's back button
  const showHeader = useComputed(
    () =>
      !showSpeechPane.value ||
      currentContent.value !== "transcript" ||
      showConversationModeToggle.value
  );

  // Alone on a page, the sheet takes the page's gray so the chat has no edges
  const isMuted = useComputed(
    () => variant.value === "page" && !showSpeechPane.value
  );

  const showExpandButton = useComputed(
    () => showTranscript.value && (config.value.show_resize_button ?? true)
  );

  return (
    <InOutTransition initial={false} active={open}>
      <div
        data-variant={variant.value}
        data-muted={isMuted.value || undefined}
        className={cn(
          "sheet group/sheet",
          "flex flex-col overflow-hidden pointer-events-auto z-2",
          isMuted.value ? "bg-base-hover" : "bg-base",
          "transition-[width,height,max-width,max-height,transform,border-radius,opacity,inset,bottom,top,left,right,margin,padding] duration-200",
          "data-hidden:scale-90 data-hidden:opacity-0",
          variant.value === "page"
            ? "relative w-full h-full"
            : cn(
                "absolute shadow-lg",
                ORIGIN_CLASSES[placement],
                placement.startsWith("top")
                  ? config.value.always_expanded
                    ? "top-0"
                    : "top-20"
                  : config.value.always_expanded
                    ? "bottom-0"
                    : "bottom-20"
              )
        )}
      >
        {showHeader.value && (
          <SheetHeader
            showBackButton={currentConfig.showHeaderBack}
            onBackClick={currentConfig.onHeaderBack}
            showStatusLabel={showStatusLabel}
            showLanguageSelector={showLanguageSelector}
            showConversationModeToggle={showConversationModeToggle}
            showExpandButton={showExpandButton}
            onClose={onClose}
          />
        )}
        <InOutTransition active={currentContent.value === "transcript"}>
          <div
            className={cn(
              "grow flex flex-col min-h-0 relative transition-opacity duration-300 ease-out data-hidden:opacity-0",
              variant.value === "page" && "w-full max-w-[768px] mx-auto"
            )}
          >
            <Transcript
              transcript={filteredTranscript}
              scrollPinned={scrollPinned}
              withoutHeader={!showHeader.value}
            />
            <SheetActions
              showTranscript={showTranscript.value}
              scrollPinned={scrollPinned}
            />
          </div>
        </InOutTransition>
        <InOutTransition active={currentContent.value === "feedback"}>
          <div className="absolute inset-0 top-[88px] flex flex-col bg-base group-data-muted/sheet:bg-base-hover transition-transform duration-300 ease-out data-hidden:translate-x-full">
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
        {variant.value !== "page" && (
          <InOutTransition active={confirmationShown}>
            <EndConfirmationDialog overlay />
          </InOutTransition>
        )}
      </div>
    </InOutTransition>
  );
}
