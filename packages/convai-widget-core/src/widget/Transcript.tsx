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
  const scrollToBottom = (smooth: boolean) => {
    scrollContainer.current?.scrollTo({
      top: scrollContainer.current.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
  };

  const firstRender = useRef(true);
  useEffect(() => {
    firstRender.current = false;
    scrollToBottom(false);
  }, []);

  useSignalEffect(() => {
    transcript.value;
    if (scrollPinned.peek()) {
      scrollToBottom(true);
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
