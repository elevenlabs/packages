import { useSignalEffect } from "@preact/signals";
import { useEffect } from "preact/compat";
import { isIosDevice } from "./isIosDevice";
import { useConversation } from "../contexts/conversation";

const BACKGROUND_CLOSE_DELAY_MS = 2000;

/**
 * Pauses a persistent text conversation while the page is hidden and resumes
 * it when the sheet is open again, the page comes back to the foreground, or
 * the network returns.
 */
export function usePersistentSessionLifecycle(open: {
  readonly value: boolean;
  peek(): boolean;
}) {
  const {
    conversationTextOnly,
    isDisconnected,
    hasStoredSession,
    disconnectSession,
    resumeSession,
  } = useConversation();

  // isDisconnected is peeked so an inactivity disconnect while the sheet stays
  // open does not reconnect in a loop.
  useSignalEffect(() => {
    if (open.value && isDisconnected.peek()) {
      void resumeSession();
    }
  });

  useEffect(() => {
    let closeTimer: ReturnType<typeof setTimeout> | null = null;

    const resumeInForeground = () => {
      if (
        document.visibilityState === "visible" &&
        open.peek() &&
        isDisconnected.peek()
      ) {
        void resumeSession();
      }
    };

    // iOS kills a backgrounded WebView's socket without a close frame, which
    // stalls the next connect for about ten seconds. Closing cleanly while
    // hidden avoids that; the debounce skips brief hides like an app switcher.
    // Other platforms keep background sockets alive, so they are left alone.
    const closeInBackground = () => {
      if (
        !isIosDevice() ||
        conversationTextOnly.peek() !== true ||
        isDisconnected.peek() ||
        !hasStoredSession.peek()
      ) {
        return;
      }
      closeTimer = setTimeout(
        () => void disconnectSession(),
        BACKGROUND_CLOSE_DELAY_MS
      );
    };

    const onVisibilityChange = () => {
      if (closeTimer) clearTimeout(closeTimer);
      closeTimer = null;
      if (document.visibilityState === "hidden") {
        closeInBackground();
      } else {
        resumeInForeground();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pageshow", resumeInForeground);
    window.addEventListener("online", resumeInForeground);
    return () => {
      if (closeTimer) clearTimeout(closeTimer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pageshow", resumeInForeground);
      window.removeEventListener("online", resumeInForeground);
    };
  }, [
    open,
    conversationTextOnly,
    isDisconnected,
    hasStoredSession,
    disconnectSession,
    resumeSession,
  ]);
}
