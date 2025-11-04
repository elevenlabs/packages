import { useComputed, useSignal } from "@preact/signals";
import {
  useFirstMessage,
  useIsConversationTextOnly,
  useTextOnly,
  useWidgetConfig,
} from "../contexts/widget-config";
import { TranscriptEntry, useConversation } from "../contexts/conversation";
import { InOutTransition } from "../components/InOutTransition";
import { clsx } from "clsx";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { StatusLabel } from "./StatusLabel";
import { Placement } from "../types/config";
import { Transcript } from "./Transcript";
import { SheetActions } from "./SheetActions";
import { FeedbackPage } from "./FeedbackPage";
import { FeedbackActions } from "./FeedbackActions";
import { useTextContents } from "../contexts/text-contents";
import { Signalish } from "../utils/signalish";
import { SheetHeader } from "./SheetHeader";
import { useSheetContent } from "../contexts/sheet-content";

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
  const text = useTextContents();
  const textOnly = useTextOnly();
  const isConversationTextOnly = useIsConversationTextOnly();
  const config = useWidgetConfig();
  const placement = config.value.placement;
  const { isDisconnected, startSession, transcript, conversationIndex } =
    useConversation();
  const firstMessage = useFirstMessage();
  const { currentContent, currentConfig } = useSheetContent();

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

  const showTranscript =
    filteredTranscript.value.length > 0 ||
    (!isDisconnected.value && config.value.transcript_enabled);
  const scrollPinned = useSignal(true);
  const showAvatar = currentContent.value !== "feedback";

  return (
    <InOutTransition initial={false} active={open}>
      <div
        className={clsx(
          "flex flex-col overflow-hidden absolute bg-base shadow-lg pointer-events-auto rounded-sheet w-full max-w-[400px] h-[calc(100%-80px)] max-h-[550px]",
          "transition-[transform,opacity] duration-200 data-hidden:scale-90 data-hidden:opacity-0",
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
          showBackButton={currentConfig.value.showHeaderBack}
          onBackClick={currentConfig.value.onHeaderBack}
          showStatusLabel={showTranscript && !isDisconnected.value}
          showShadow={showTranscript}
          showLanguageSelector={
            currentContent.value !== "feedback" &&
            (!showTranscript || isDisconnected.value)
          }
        />
        {currentContent.value === "transcript" && (
          <>
            <Transcript
              transcript={filteredTranscript}
              scrollPinned={scrollPinned}
            />
            <SheetActions
              scrollPinned={scrollPinned}
              showTranscript={showTranscript}
            />
          </>
        )}
        <InOutTransition active={currentContent.value === "feedback"}>
          <div className="absolute inset-0 top-[88px] flex flex-col bg-base transition-transform duration-300 ease-out data-hidden:translate-x-full">
            <FeedbackPage />
            <FeedbackActions />
          </div>
        </InOutTransition>
        {showAvatar && (
          <div
            className={clsx(
              "absolute origin-top-left transition-[transform,left,top] duration-200 z-1",
              showTranscript
                ? "top-4 left-4 scale-[0.1667]" // ~32px size
                : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100"
            )}
          >
            <Avatar size="lg" />
            <InOutTransition
              active={!showTranscript && isDisconnected.value && !textOnly.value}
            >
              <div className="absolute bottom-0 p-1 rounded-[calc(var(--el-button-radius)+4px)] bg-base left-1/2 -translate-x-1/2 translate-y-1/2 transition-[opacity,transform] data-hidden:opacity-0 data-hidden:scale-100 scale-150">
                <Button
                  aria-label={text.start_call}
                  variant="primary"
                  icon="phone"
                  onClick={e => startSession(e.currentTarget)}
                />
              </div>
            </InOutTransition>
            <InOutTransition active={!showTranscript && !isDisconnected.value}>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 translate-y-full transition-[opacity,transform] data-hidden:opacity-0 data-hidden:scale-75">
                <StatusLabel />
              </div>
            </InOutTransition>
          </div>
        )}
      </div>
    </InOutTransition>
  );
}
