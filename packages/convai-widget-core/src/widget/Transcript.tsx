import { ReadonlySignal, Signal, useSignalEffect } from "@preact/signals";
import { TranscriptEntry } from "../contexts/conversation";
import { useEffect, useRef } from "preact/compat";
import { TranscriptMessage } from "./TranscriptMessage";

interface TranscriptProps {
  scrollPinned: Signal<boolean>;
  transcript: ReadonlySignal<TranscriptEntry[]>;
}

export function Transcript({ scrollPinned, transcript }: TranscriptProps) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const scrollToBottom = () => {
    scrollContainer.current?.scrollTo(0, scrollContainer.current.scrollHeight);
  };

  const firstRender = useRef(true);
  useEffect(() => {
    firstRender.current = false;
    scrollToBottom();
  }, []);

  useSignalEffect(() => {
    transcript.value;
    if (scrollPinned.peek()) {
      scrollToBottom();
    }
  });

  return (
    <div
      ref={scrollContainer}
      onScroll={e => {
        scrollPinned.value =
          e.currentTarget.scrollTop >=
          e.currentTarget.scrollHeight - e.currentTarget.clientHeight;
      }}
      className="px-4 pb-3 grow flex flex-col gap-3 overflow-y-auto"
    >
      {transcript.value.map((entry, index) => (
        <TranscriptMessage
          key={`${entry.message}-${index}`}
          entry={entry}
          animateIn={!firstRender.current}
        />
      ))}
    </div>
  );
}
