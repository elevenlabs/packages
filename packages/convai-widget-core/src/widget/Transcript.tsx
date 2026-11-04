import {
  ReadonlySignal,
  Signal,
  useComputed,
  useSignal,
} from "@preact/signals";
import { useEffect, useRef } from "preact/compat";
import { DisplayTranscriptEntry } from "../utils/display-transcript";
import { TranscriptMessage } from "./TranscriptMessage";
import { useStickToBottom } from "../utils/useStickToBottom";
import { Button } from "../components/Button";
import { InOutTransition } from "../components/InOutTransition";
import { useTextContents } from "../contexts/text-contents";

interface TranscriptProps {
  scrollPinned: Signal<boolean>;
  transcript: ReadonlySignal<DisplayTranscriptEntry[]>;
}

export function Transcript({ scrollPinned, transcript }: TranscriptProps) {
  const text = useTextContents();
  const {
    scrollContainer,
    contentRef,
    handleScroll,
    firstRender,
    jumpToLatest,
  } = useStickToBottom({ scrollPinned });

  const messageCount = useComputed(
    () =>
      transcript.value.filter(entry => entry.type !== "typing_indicator").length
  );
  const countWhenUnpinned = useSignal<number | null>(null);
  // subscribe runs synchronously, unlike useSignalEffect which waits a render
  useEffect(
    () =>
      scrollPinned.subscribe(pinned => {
        countWhenUnpinned.value = pinned ? null : messageCount.peek();
      }),
    [scrollPinned, countWhenUnpinned, messageCount]
  );
  const unseenCount = useComputed(() =>
    countWhenUnpinned.value === null
      ? 0
      : Math.max(0, messageCount.value - countWhenUnpinned.value)
  );

  // Keep the last count so the pill doesn't read 0 while it fades out
  const shownCount = useRef(0);
  if (unseenCount.value > 0) shownCount.current = unseenCount.value;
  const label =
    shownCount.current === 1
      ? text.new_message.value
      : text.new_messages.value.replace("{count}", String(shownCount.current));

  return (
    <div className="relative grow min-h-0 flex flex-col z-2">
      <div
        ref={scrollContainer}
        className="px-4 pt-20 pb-4 grow overflow-y-auto"
        onScroll={handleScroll}
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
      <InOutTransition active={unseenCount.value > 0}>
        <Button
          variant="primary"
          icon="arrow-down"
          onClick={jumpToLatest}
          className="absolute bottom-4 left-1/2 -translate-x-1/2 h-10 px-4 border-0 rounded-full shadow-md transition-[opacity,translate] duration-200 data-hidden:opacity-0 data-hidden:translate-y-2"
        >
          {label}
        </Button>
      </InOutTransition>
    </div>
  );
}
