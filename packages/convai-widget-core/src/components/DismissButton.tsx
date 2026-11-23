import { Button, BaseButtonProps } from "./Button";
import { useTextContents } from "../contexts/text-contents";

interface DismissButtonProps extends Omit<BaseButtonProps, "icon" | "aria-label"> {
  onDismiss?: () => void;
}

export function DismissButton({
  onDismiss,
  className,
  ...rest
}: DismissButtonProps) {
  const text = useTextContents();
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="secondary"
      icon="minimize"
      aria-label={text.dismiss}
      className={className}
      {...rest}
    />
  );
}
