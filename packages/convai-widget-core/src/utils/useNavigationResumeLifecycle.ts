import { useSignalEffect } from "@preact/signals";
import { useEffect } from "preact/compat";
import { useAudioConfig } from "../contexts/audio-config";
import { useConversation } from "../contexts/conversation";

/** Saves a live call on navigation and restores its mute once continued. */
export function useNavigationResumeLifecycle() {
  const { status, navigationResumeMicMuted, storeNavigationResume } =
    useConversation();
  const { isMuted, setIsMuted } = useAudioConfig();

  // `pagehide` is the last event a page reliably gets.
  useEffect(() => {
    const handlePageHide = () => {
      storeNavigationResume({ micMuted: isMuted.peek() });
    };

    window.addEventListener("pagehide", handlePageHide);
    return () => {
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [isMuted, storeNavigationResume]);

  // Muting resets on disconnect, so reapply it once the call connects.
  useSignalEffect(() => {
    if (status.value === "connected" && navigationResumeMicMuted.value) {
      navigationResumeMicMuted.value = false;
      setIsMuted(true);
    }
  });
}
