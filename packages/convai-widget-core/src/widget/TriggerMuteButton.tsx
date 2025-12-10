import { useCallback } from "preact/compat";
import { useAudioConfig } from "../contexts/audio-config";
import { Button, ButtonProps } from "../components/Button";
import { useTextContents } from "../contexts/text-contents";

export function TriggerMuteButton(props: Omit<ButtonProps, "icon">) {
  const text = useTextContents();
  const { isMuted, isMutingEnabled, setIsMuted } = useAudioConfig();

  const onClick = useCallback(() => {
    setIsMuted(!isMuted.peek());
  }, [setIsMuted]);

  if (!isMutingEnabled.value) {
    return null;
  }

  return (
    <Button
      aria-label={text.mute_microphone}
      aria-pressed={isMuted.value}
      icon={isMuted.value ? "mic-off" : "mic"}
      onClick={onClick}
      {...props}
    />
  );
}
