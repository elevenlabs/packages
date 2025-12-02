import { ReadonlySignal, Signal } from "@preact/signals";
import { TranscriptEntry } from "../contexts/conversation";
import { TranscriptMessage } from "./TranscriptMessage";
import { useStickToBottom } from "../utils/useStickToBottom";

interface TranscriptProps {
  scrollPinned: Signal<boolean>;
  transcript: ReadonlySignal<TranscriptEntry[]>;
}

export function Transcript({ scrollPinned, transcript }: TranscriptProps) {
  const {
    scrollContainer,
    contentRef,
    handleScroll,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    firstRender,
  } = useStickToBottom({ scrollPinned });

  return (
    <div
      ref={scrollContainer}
      className="px-4 pt-20 pb-4 grow overflow-y-auto z-2"
      onScroll={handleScroll}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div ref={contentRef} className="flex flex-col gap-6">
        {transcript.value.map((entry, index) => (
          <TranscriptMessage
            key={`${index}-${entry.conversationIndex}`}
            entry={entry}
            animateIn={!firstRender.current}
          />
        ))}
      </div>
    </div>
  );
}
