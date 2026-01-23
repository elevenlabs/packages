import { HTMLAttributes } from "preact/compat";
import { clsx } from "clsx";
import { Avatar } from "./Avatar";

interface ExpandButtonProps extends HTMLAttributes<HTMLButtonElement> {
  onExpand?: () => void;
}

export function ExpandButton({
  className,
  onExpand,
  ...rest
}: ExpandButtonProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onExpand) {
      onExpand();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200 pointer-events-auto hover:scale-105 active:scale-95",
        className
      )}
      aria-label="Open chat"
      {...rest}
    >
      <Avatar className="w-12 h-12" />
    </button>
  );
}
