import { Button } from "../components/Button";
import { useTextContents } from "../contexts/text-contents";
import { useConversation } from "../contexts/conversation";
import {
  useIsConversationTextOnly,
  useTextOnly,
  useWidgetConfig,
} from "../contexts/widget-config";
import { useMicConfig } from "../contexts/mic-config";

interface ModeToggleButtonProps {
  visible: boolean;
}

export function ModeToggleButton({ visible }: ModeToggleButtonProps) {
  const text = useTextContents();
  const { toggleMode } = useConversation();
  const isConversationTextOnly = useIsConversationTextOnly();
  const textOnly = useTextOnly();
  const config = useWidgetConfig();
  const { setIsMuted } = useMicConfig();

  if (
    !visible ||
    !config.value.supports_text_only ||
    textOnly.value
  ) {
    return null;
  }

  const isCurrentlyTextMode = isConversationTextOnly.value;
  const ariaLabel = isCurrentlyTextMode
    ? text.switch_to_voice.value
    : text.switch_to_chat.value;
  const icon = isCurrentlyTextMode ? "phone" : "chat";

  const handleToggle = async () => {
    await toggleMode();
  };

  return (
    <Button
      variant="ghost"
      onClick={handleToggle}
      aria-label={ariaLabel}
      icon={icon}
      className="!h-9 !w-9 !min-w-9"
    />
  );
}

