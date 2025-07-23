import { useRef, useCallback } from "react";
import type { Callbacks } from "../types";

export const useConversationCallbacks = () => {
  const callbacksRef = useRef<Callbacks>({});

  const setCallbacks = useCallback((callbacks: Callbacks) => {
    callbacksRef.current = callbacks;
  }, []);

  return {
    callbacksRef,
    setCallbacks,
  };
};
