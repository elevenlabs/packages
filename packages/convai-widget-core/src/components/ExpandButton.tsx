import { HTMLAttributes } from "preact/compat";
import { clsx } from "clsx";

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
        "w-12 h-12 bg-base shadow-md rounded-full flex items-center justify-center transition-all duration-200 pointer-events-auto hover:scale-105 active:scale-95",
        className
      )}
      aria-label="Open chat"
      {...rest}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 19 18"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        className="text-base-primary"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M1.5 6.75C1.5 4.26472 3.51472 2.25 6 2.25H12C14.4853 2.25 16.5 4.26472 16.5 6.75V11.25C16.5 13.7353 14.4853 15.75 12 15.75H2.25C1.83579 15.75 1.5 15.4142 1.5 15V6.75ZM6 9.9375C5.48223 9.9375 5.0625 9.51777 5.0625 9C5.0625 8.48223 5.48223 8.0625 6 8.0625C6.51777 8.0625 6.9375 8.48223 6.9375 9C6.9375 9.51777 6.51777 9.9375 6 9.9375ZM9 9.9375C8.48223 9.9375 8.0625 9.51777 8.0625 9C8.0625 8.48223 8.48223 8.0625 9 8.0625C9.51777 8.0625 9.9375 8.48223 9.9375 9C9.9375 9.51777 9.51777 9.9375 9 9.9375ZM11.0625 9C11.0625 9.51777 11.4822 9.9375 12 9.9375C12.5178 9.9375 12.9375 9.51777 12.9375 9C12.9375 8.48223 12.5178 8.0625 12 8.0625C11.4822 8.0625 11.0625 8.48223 11.0625 9Z"
        />
      </svg>
    </button>
  );
}
