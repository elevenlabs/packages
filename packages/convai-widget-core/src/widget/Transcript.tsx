import { ReadonlySignal, Signal, useSignalEffect } from "@preact/signals";
import { TranscriptEntry } from "../contexts/conversation";
import { useEffect, useRef } from "preact/compat";
import { TranscriptMessage } from "./TranscriptMessage";

const SCROLL_PIN_PADDING = 16;

interface TranscriptProps {
  scrollPinned: Signal<boolean>;
  transcript: ReadonlySignal<TranscriptEntry[]>;
}

export function Transcript({ scrollPinned, transcript }: TranscriptProps) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const lastMessageLength = useRef<number>(0);
  const scrollAnimationFrame = useRef<number | null>(null);
  const isScrolling = useRef(false);
  const userInterrupted = useRef(false);

  const scrollToBottom = (smooth: boolean) => {
    scrollContainer.current?.scrollTo({
      top: scrollContainer.current.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
  };

  const smoothScrollToTarget = () => {
    const container = scrollContainer.current;
    if (!container || !isScrolling.current || userInterrupted.current) return;

    const currentScroll = container.scrollTop;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const distance = maxScroll - currentScroll;

    // If we're very close, snap to bottom andkeep the animation running during streaming to handle new content
    if (Math.abs(distance) < 1) {
      container.scrollTop = maxScroll;
      scrollAnimationFrame.current =
        requestAnimationFrame(smoothScrollToTarget);
      return;
    }

    // exponential interpolation iwht min
    const smoothStep = distance * 0.2;
    const minStep = 2;
    container.scrollTop = currentScroll + Math.max(smoothStep, minStep);
    scrollAnimationFrame.current = requestAnimationFrame(smoothScrollToTarget);
  };

  const startSmoothScroll = () => {
    const container = scrollContainer.current;
    if (!container || userInterrupted.current) return;

    if (!isScrolling.current) {
      isScrolling.current = true;
      scrollAnimationFrame.current =
        requestAnimationFrame(smoothScrollToTarget);
    }
  };

  const firstRender = useRef(true);
  useEffect(() => {
    firstRender.current = false;
    scrollToBottom(false);

    return () => {
      if (scrollAnimationFrame.current) {
        cancelAnimationFrame(scrollAnimationFrame.current);
      }
    };
  }, []);

  useSignalEffect(() => {
    const currentTranscript = transcript.value;
    if (!scrollPinned.peek()) return;

    const lastEntry = currentTranscript[currentTranscript.length - 1];
    const isStreaming =
      lastEntry?.type === "message" &&
      lastEntry?.role === "agent" &&
      lastEntry?.isText === true;

    if (isStreaming) {
      const currentLength = lastEntry.message?.length || 0;

      // On first chunk (the start chunk), wait
      if (lastMessageLength.current === 0 && currentLength > 0) {
        lastMessageLength.current = currentLength;
        userInterrupted.current = false;

        // Use double RAF to ensure DOM has fully updated with the new text
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (!userInterrupted.current && scrollPinned.peek()) {
              scrollToBottom(false);
              startSmoothScroll();
            }
          });
        });
      } else if (currentLength > lastMessageLength.current) {
        lastMessageLength.current = currentLength;
        startSmoothScroll();
      }
    } else {
      lastMessageLength.current = 0;
      isScrolling.current = false;
      userInterrupted.current = false;
      if (scrollAnimationFrame.current) {
        cancelAnimationFrame(scrollAnimationFrame.current);
        scrollAnimationFrame.current = null;
      }
      scrollToBottom(true);
    }
  });

  return (
    <div
      ref={scrollContainer}
      onScroll={e => {
        const isAtBottom =
          e.currentTarget.scrollTop >=
          e.currentTarget.scrollHeight -
            e.currentTarget.clientHeight -
            SCROLL_PIN_PADDING;

        scrollPinned.value = isAtBottom;

        // If user scrolls away from bottom while streaming, stop the animation
        if (!isAtBottom && isScrolling.current) {
          userInterrupted.current = true;
          isScrolling.current = false;
          if (scrollAnimationFrame.current) {
            cancelAnimationFrame(scrollAnimationFrame.current);
            scrollAnimationFrame.current = null;
          }
        }
      }}
      className="px-4 pt-3 pb-3 grow flex flex-col gap-3 overflow-x-hidden overflow-y-auto"
    >
      {transcript.value.map((entry, index) => (
        <TranscriptMessage
          key={`${index}-${entry.conversationIndex}`}
          entry={entry}
          animateIn={!firstRender.current}
        />
      ))}
    </div>
  );
}
