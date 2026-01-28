import { ReadonlySignal, Signal } from "@preact/signals";
import { TranscriptEntry } from "../contexts/conversation";
import { TranscriptMessage } from "./TranscriptMessage";
import { useStickToBottom } from "../utils/useStickToBottom";

interface TranscriptProps {
  scrollPinned: Signal<boolean>;
  transcript: ReadonlySignal<TranscriptEntry[]>;
}

function TranscriptSpacer({
  entry,
  prevEntry,
}: {
  entry: TranscriptEntry;
  prevEntry: TranscriptEntry;
}) {
  // Tool call entries have smaller gap (8px)
  if (entry.type === "tool_call" || prevEntry.type === "tool_call") {
    return <div className="h-2" />;
  }

  // Default gap (24px)
  return <div className="h-6" />;
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
      <div ref={contentRef} className="flex flex-col">
        {transcript.value.map((entry, index) => (
          <>
            {index > 0 && (
              <TranscriptSpacer
                key={`spacer-${index}`}
                entry={entry}
                prevEntry={transcript.value[index - 1]}
              />
            )}
            <TranscriptMessage
              key={`${index}-${entry.conversationIndex}`}
              entry={entry}
              animateIn={!firstRender.current}
            />
          </>
        ))}
      </div>
    </div>
  );
}