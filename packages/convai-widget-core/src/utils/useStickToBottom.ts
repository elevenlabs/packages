import { Signal } from "@preact/signals";
import { useCallback, useEffect, useRef } from "preact/compat";

const SCROLL_PIN_PADDING = 16;

interface UseStickToBottomOptions {
  scrollPinned: Signal<boolean>;
}

export function useStickToBottom({ scrollPinned }: UseStickToBottomOptions) {
  const scrollContainer = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  const scrollToBottom = useCallback(() => {
    const container = scrollContainer.current;
    if (!container) return;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Only unpin when scrolling up (away from bottom)
      if (e.deltaY < 0) {
        scrollPinned.value = false;
      }
    },
    [scrollPinned]
  );

  const lastTouchY = useRef<number | null>(null);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.touches[0];
    if (touch) {
      lastTouchY.current = touch.clientY;
    }
  }, []);

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch && lastTouchY.current !== null) {
        // If moving finger down, user is scrolling up (away from bottom)
        if (touch.clientY > lastTouchY.current) {
          scrollPinned.value = false;
        }
        lastTouchY.current = touch.clientY;
      }
    },
    [scrollPinned]
  );

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

    const content = contentRef.current;
    const container = scrollContainer.current;
    if (!content || !container) return;

    // Track initial height to detect first message vs initial render
    let lastHeight = content.getBoundingClientRect().height;

    const resizeObserver = new ResizeObserver(([entry]) => {
      const newHeight = entry.contentRect.height;
      const heightGrew = newHeight > lastHeight;
      lastHeight = newHeight;

      // Only scroll if content actually grew and we're pinned
      if (heightGrew && scrollPinned.peek()) {
        scrollToBottom();
      }
    });

    resizeObserver.observe(content);
    return () => resizeObserver.disconnect();
  }, [scrollPinned, scrollToBottom]);

  return {
    scrollContainer,
    contentRef,
    handleScroll,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    firstRender,
  };
}
