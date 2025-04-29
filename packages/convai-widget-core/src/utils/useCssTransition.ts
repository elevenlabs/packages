import { TransitionEvent, useRef } from "preact/compat";
import { useSignal } from "@preact/signals";

interface CSSTransitionOptions {
  onStart?: () => void;
  onEnd?: () => void;
}

export function useCSSTransition({ onStart, onEnd }: CSSTransitionOptions) {
  const transitionProperties = useRef<Set<string>>();
  transitionProperties.current ??= new Set();
  const onStartRef = useRef(onStart);
  onStartRef.current = onStart;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const transitioning = useSignal(false);

  const handleTransitionStart = (e: TransitionEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) {
      transitionProperties.current?.add(e.propertyName);
      if (!transitioning.peek()) {
        transitioning.value = true;
        onStartRef.current?.();
      }
    }
  };

  const handleTransitionEnd = (e: TransitionEvent<HTMLElement>) => {
    if (e.target === e.currentTarget) {
      transitionProperties.current?.delete(e.propertyName);
      if (!transitionProperties.current?.size) {
        transitioning.value = false;
        onEndRef.current?.();
      }
    }
  };

  return {
    transitioning,
    handlers: {
      onTransitionStart: handleTransitionStart,
      onTransitionEnd: handleTransitionEnd,
    },
  };
}
