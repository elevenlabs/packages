import { clsx } from "clsx";
import { TextareaHTMLAttributes } from "preact/compat";

export function TextArea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={clsx(
        "px-3 py-[calc(theme(spacing.2)-1px)] border text-sm text-base-primary bg-base border-base-border rounded-input focus-ring resize-none [field-sizing:content] placeholder:text-base-subtle",
        className
      )}
      {...props}
    />
  );
}
