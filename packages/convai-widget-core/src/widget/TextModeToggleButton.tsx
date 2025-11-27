import { useCallback } from "preact/compat";
import { useTextMode } from "../contexts/text-mode";
import { Button, ButtonProps } from "../components/Button";
import { useTextContents } from "../contexts/text-contents";

export function TextModeToggleButton(props: Omit<ButtonProps, "icon" | "onClick" | "aria-label" | "aria-pressed">) {
  const text = useTextContents();
  const { isTextMode, setIsTextMode } = useTextMode();

  const onClick = useCallback(() => {
    setIsTextMode(!isTextMode.peek());
  }, [setIsTextMode, isTextMode]);

  return (
    <Button
      aria-label={isTextMode.value ? text.voice_mode : text.text_mode}
      aria-pressed={isTextMode.value}
      icon={isTextMode.value ? "soundwave" : "chat"}
      onClick={onClick}
      {...props}
    />
  );
}
