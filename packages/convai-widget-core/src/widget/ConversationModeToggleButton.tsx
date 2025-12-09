import { useCallback } from "preact/compat";
import {
  ConversationMode,
  useConversationMode,
} from "../contexts/conversation-mode";
import { Button, ButtonProps } from "../components/Button";
import { useTextContents } from "../contexts/text-contents";

export function ConversationModeToggleButton(
  props: Omit<ButtonProps, "icon" | "onClick" | "aria-label" | "aria-pressed">
) {
  const text = useTextContents();
  const { mode, setMode } = useConversationMode();

  const onClick = useCallback(() => {
    const newMode =
      mode.peek() === ConversationMode.Text
        ? ConversationMode.Voice
        : ConversationMode.Text;
    setMode(newMode);
  }, [setMode, mode]);

  const isTextMode = mode.value === ConversationMode.Text;

  return (
    <Button
      aria-label={isTextMode ? text.voice_mode : text.text_mode}
      aria-pressed={isTextMode}
      icon={isTextMode ? "soundwave" : "chat"}
      onClick={onClick}
      {...props}
    />
  );
}
