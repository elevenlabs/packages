import { HTMLAttributes } from "preact/compat";
import { clsx } from "clsx";

interface DismissButtonProps extends HTMLAttributes<HTMLButtonElement> {
  onDismiss?: () => void;
}

export function DismissButton({
  className,
  onDismiss,
  ...rest
}: DismissButtonProps) {
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onDismiss) {
      onDismiss();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={clsx(
        "w-4 h-4 bg-base-hover border border-base-border rounded-full flex items-center justify-center transition-all duration-200 pointer-events-auto hover:opacity-80",
        className
      )}
      aria-label="Dismiss"
      {...rest}
    >
      <svg
        width="8"
        height="8"
        viewBox="0 0 10 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-base-subtle"
      >
        <path
          d="M7 3L3 7M3 3L7 7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}