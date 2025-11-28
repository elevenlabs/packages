import { useCallback } from "preact/compat";
import { useTextMode } from "../contexts/text-mode";
import { Button, ButtonProps } from "../components/Button";
import { SizeTransition } from "../components/SizeTransition";
import { useTextContents } from "../contexts/text-contents";

interface TextModeToggleButtonProps extends Omit<ButtonProps, "icon"> {
  visible: boolean;
}

export function TextModeToggleButton({
  visible,
  ...rest
}: TextModeToggleButtonProps) {
  const text = useTextContents();
  const { isTextMode, setIsTextMode } = useTextMode();

  const onClick = useCallback(() => {
    setIsTextMode(!isTextMode.peek());
  }, [setIsTextMode, isTextMode]);

  return (
    <SizeTransition visible={visible} className="p-1">
      <Button
        aria-label={isTextMode.value ? text.voice_mode : text.text_mode}
        aria-pressed={isTextMode}
        icon={isTextMode.value ? "mic" : "chat"}
        onClick={onClick}
        {...rest}
      />
    </SizeTransition>
  );
}
