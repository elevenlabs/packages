import { useSignalEffect } from "@preact/signals";
import { useEffect } from "preact/compat";
import { useAudioConfig } from "../contexts/audio-config";
import { useConversation } from "../contexts/conversation";

/**
 * Hands a live voice call to the page being navigated to, and restores what
 * carries over once the visitor picks the call back up.
 */
export function useNavigationResumeLifecycle() {
  const { status, navigationResumeMicMuted, storeNavigationResume } =
    useConversation();
  const { isMuted, setIsMuted } = useAudioConfig();

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

  // Muting is reset on every disconnect, so the previous page's choice is
  // reapplied once the continued call is up rather than before it starts. The
  // conversation only asks for it once that call connects, so a text chat or
  // a fresh call started in the meantime is left unmuted.
  useSignalEffect(() => {
    if (status.value === "connected" && navigationResumeMicMuted.value) {
      navigationResumeMicMuted.value = false;
      setIsMuted(true);
    }
  });
}
