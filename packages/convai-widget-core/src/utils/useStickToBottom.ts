import {
  ReadonlySignal,
  Signal,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import { useCallback, useEffect, useRef } from "preact/compat";
import { TranscriptEntry } from "../contexts/conversation";

const SCROLL_PIN_PADDING = 16;

interface UseStickToBottomOptions {
  scrollPinned: Signal<boolean>;
  transcript: ReadonlySignal<TranscriptEntry[]>;
}

export function useStickToBottom({
  scrollPinned,
  transcript,
}: UseStickToBottomOptions) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const lastMessageLength = useRef<number>(0);
  const scrollAnimationFrame = useRef<number | null>(null);
  const isScrolling = useRef(false);
  const userInterrupted = useRef(false);
  const firstRender = useRef(true);

  const scrollToBottom = useCallback((smooth: boolean) => {
    scrollContainer.current?.scrollTo({
      top: scrollContainer.current.scrollHeight,
      behavior: smooth ? "smooth" : "instant",
    });
  }, []);

  const smoothScrollToTarget = useCallback(() => {
    const container = scrollContainer.current;
    if (!container || !isScrolling.current || userInterrupted.current) return;

    const currentScroll = container.scrollTop;
    const maxScroll = container.scrollHeight - container.clientHeight;
    const distance = maxScroll - currentScroll;

    if (Math.abs(distance) < 1) {
      container.scrollTop = maxScroll;
      scrollAnimationFrame.current =
        requestAnimationFrame(smoothScrollToTarget);
      return;
    }

    const smoothStep = distance * 0.2;
    const minStep = 2;
    container.scrollTop = currentScroll + Math.max(smoothStep, minStep);
    scrollAnimationFrame.current = requestAnimationFrame(smoothScrollToTarget);
  }, []);

  const startSmoothScroll = useCallback(() => {
    const container = scrollContainer.current;
    if (!container || userInterrupted.current) return;

    if (!isScrolling.current) {
      isScrolling.current = true;
      scrollAnimationFrame.current =
        requestAnimationFrame(smoothScrollToTarget);
    }
  }, [smoothScrollToTarget]);

  const handleUserInteraction = useCallback(() => {
    scrollPinned.value = false;
    userInterrupted.current = true;
  }, [scrollPinned]);

  const handleScroll = useCallback(() => {
    const container = scrollContainer.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const isAtBottom =
      scrollHeight - scrollTop - clientHeight <= SCROLL_PIN_PADDING;

    if (isAtBottom) {
      scrollPinned.value = true;
    }
  }, [scrollPinned]);

  useEffect(() => {
    firstRender.current = false;
    scrollToBottom(false);

    return () => {
      if (scrollAnimationFrame.current) {
        cancelAnimationFrame(scrollAnimationFrame.current);
      }
    };
  }, [scrollToBottom]);

  useSignalEffect(() => {
    const currentTranscript = transcript.value;
    if (!scrollPinned.peek()) return;

    const lastEntry = currentTranscript[currentTranscript.length - 1];
    const isStreamingEntry =
      lastEntry?.type === "message" &&
      lastEntry?.role === "ai" &&
      lastEntry?.isText === true;

    if (isStreamingEntry) {
      const currentLength = lastEntry.message?.length || 0;

      if (lastMessageLength.current === 0 && currentLength > 0) {
        lastMessageLength.current = currentLength;
        userInterrupted.current = false;

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

  return {
    scrollContainer,
    handleScroll,
    handleUserInteraction,
    firstRender,
  };
}
