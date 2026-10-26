import { useSignalEffect } from "@preact/signals";
import { useEffect, useRef } from "preact/compat";
import { useAudioConfig } from "../contexts/audio-config";
import { useConversation } from "../contexts/conversation";

/**
 * Hands a live voice call to the page being navigated to, and restores what
 * carries over once the visitor picks the call back up.
 */
export function useNavigationResumeLifecycle() {
  const { status, pendingNavigationResume, storeNavigationResume } =
    useConversation();
  const { isMuted, setIsMuted } = useAudioConfig();
  const restoreMicMutedRef = useRef(false);

  // `pagehide` is the last event a page reliably gets, including one about to
  // enter the back/forward cache.
  useEffect(() => {
    const handlePageHide = () => {
      storeNavigationResume({ micMuted: isMuted.peek() });
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [isMuted, storeNavigationResume]);

  useEffect(() => {
    restoreMicMutedRef.current =
      pendingNavigationResume.peek()?.micMuted ?? false;
  }, [pendingNavigationResume]);

  // Muting is reset on every disconnect, so the previous page's choice is
  // reapplied once the call is back up rather than before it starts.
  useSignalEffect(() => {
    if (status.value === "connected" && restoreMicMutedRef.current) {
      restoreMicMutedRef.current = false;
      setIsMuted(true);
    }
  });
}
