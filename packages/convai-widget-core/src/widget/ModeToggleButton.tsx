import { useCallback } from "preact/compat";
import { useConversation } from "../contexts/conversation";
import { Button, ButtonProps } from "../components/Button";
import { SizeTransition } from "../components/SizeTransition";
import { useTextContents } from "../contexts/text-contents";

interface EnableVoiceButtonProps extends Omit<ButtonProps, "icon"> {
  visible: boolean;
}

export function ModeToggleButton({
  visible,
  ...rest
}: EnableVoiceButtonProps) {
  const text = useTextContents();
  const conversation = useConversation();

  const handleEnableVoice = useCallback(async () => {
    await conversation.enableVoiceMode?.();
  }, [conversation]);

  const isLoading = conversation.enablingVoice.value;
  
  // Only show if in text mode AND voice has not been enabled yet
  const shouldShow = visible && 
    conversation.conversationTextOnly.value === true && 
    !conversation.voiceEnabled.value;

  return (
    <SizeTransition visible={shouldShow} className="p-1">
      <Button
        aria-label={text.switch_to_voice}
        icon="phone"
        onClick={handleEnableVoice}
        disabled={isLoading}
        className="!h-9 !w-9 !min-w-9"
        {...rest}
      />
    </SizeTransition>
  );
}


