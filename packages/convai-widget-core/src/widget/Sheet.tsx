import { Signal, useComputed, useSignal } from "@preact/signals";
import { useWidgetConfig } from "../contexts/widget-config";
import { useConversation } from "../contexts/conversation";
import { InOutTransition } from "../components/InOutTransition";
import { clsx } from "clsx";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";
import { StatusLabel } from "./StatusLabel";
import { Placement } from "../types/config";
import { SheetLanguageSelect } from "./SheetLanguageSelect";
import { SheetActions } from "./SheetActions";
import { Transcript } from "./Transcript";
import { useTextContents } from "../contexts/text-contents";

interface SheetProps {
  open: Signal<boolean>;
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
  const config = useWidgetConfig();
  const placement = config.value.placement;
  const { isDisconnected, startSession, transcript } = useConversation();
  const filteredTranscript = useComputed(() => {
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

  return (
    <InOutTransition active={open}>
      <div
        className={clsx(
          "flex flex-col overflow-hidden absolute bg-base shadow-lg pointer-events-auto rounded-sheet w-full max-w-[400px] h-[calc(100%-80px)] max-h-[550px]",
          "transition-[transform,opacity] duration-200 data-hidden:scale-90 data-hidden:opacity-0",
          ORIGIN_CLASSES[placement],
          placement.startsWith("top") ? "top-20" : "bottom-20"
        )}
      >
        <div className="bg-base shrink-0 flex gap-2 p-4 items-start">
          <div className="relative w-16 h-16" />
          <InOutTransition active={showTranscript && !isDisconnected.value}>
            <StatusLabel className="rounded-bl-[calc(var(--el-bubble-radius)/3)] transition-opacity data-hidden:opacity-0" />
          </InOutTransition>
        </div>
        <Transcript
          transcript={filteredTranscript}
          scrollPinned={scrollPinned}
        />
        <SheetActions
          scrollPinned={scrollPinned}
          showTranscript={showTranscript}
        />
        <InOutTransition active={!showTranscript || isDisconnected.value}>
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-center transition-[opacity,transform] duration-200 data-hidden:opacity-0 data-hidden:-translate-y-4">
            <SheetLanguageSelect />
          </div>
        </InOutTransition>
        <div
          className={clsx(
            "absolute origin-top-left transition-[transform,left,top] duration-200 z-1",
            showTranscript
              ? "top-4 left-4 scale-[0.333]"
              : "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-100"
          )}
        >
          <Avatar size="lg" />
          <InOutTransition active={!showTranscript && isDisconnected.value}>
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
      </div>
    </InOutTransition>
  );
}
