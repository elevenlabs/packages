import { Signal, useSignal } from "@preact/signals";
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
  const placement = useWidgetConfig().value.placement;
  const { isDisconnected, startSession, transcript } = useConversation();

  const transcriptEnabled = true;
  const showTranscript =
    transcript.value.length > 0 || (!isDisconnected.value && transcriptEnabled);
  const scrollPinned = useSignal(true);

  return (
    <InOutTransition active={open}>
      <div
        className={clsx(
          "flex flex-col overflow-hidden absolute bg-background shadow-md pointer-events-auto rounded-3xl w-[400px] h-[550px]",
          "transition-[transform,opacity] duration-200 data-hidden:scale-90 data-hidden:opacity-0",
          ORIGIN_CLASSES[placement],
          placement.startsWith("top") ? "top-20" : "bottom-20"
        )}
      >
        <div className="bg-background shrink-0 flex gap-2 p-4 items-start">
          <div className="relative w-16 h-16" />
          <InOutTransition active={showTranscript && !isDisconnected.value}>
            <StatusLabel className="rounded-bl-md transition-opacity data-hidden:opacity-0" />
          </InOutTransition>
        </div>
        <Transcript scrollPinned={scrollPinned} />
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
            <div className="absolute bottom-0 p-1 rounded-full bg-background left-1/2 -translate-x-1/2 translate-y-1/2 transition-[opacity,transform] data-hidden:opacity-0 data-hidden:scale-100 scale-150">
              <Button
                aria-label="Start call"
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
