import { useCallback } from "preact/compat";
import { useMicConfig } from "../contexts/mic-config";
import { useConversation } from "../contexts/conversation";
import { Button, ButtonProps } from "../components/Button";
import { SizeTransition } from "../components/SizeTransition";
import { useTextContents } from "../contexts/text-contents";

interface TriggerMuteButtonProps extends Omit<ButtonProps, "icon"> {
  visible: boolean;
}

export function TriggerMuteButton({
  visible,
  ...rest
}: TriggerMuteButtonProps) {
  const text = useTextContents();
  const { isMuted, isMutingEnabled, setIsMuted } = useMicConfig();
  const conversation = useConversation();

  const onClick = useCallback(() => {
    const newMutedState = !isMuted.peek();
    setIsMuted(newMutedState); 
    conversation.setMicMuted?.(newMutedState);  
  }, [setIsMuted, conversation, isMuted]);

  if (!isMutingEnabled.value) {
    return null;
  }

  return (
    <SizeTransition visible={visible} className="p-1">
      <Button
        aria-label={text.mute_microphone}
        aria-pressed={isMuted}
        icon={isMuted.value ? "mic-off" : "mic"}
        onClick={onClick}
        {...rest}
      />
    </SizeTransition>
  );
}
