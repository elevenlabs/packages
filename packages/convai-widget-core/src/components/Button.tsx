import { clsx } from "clsx";
import { ButtonHTMLAttributes } from "preact/compat";
import { Icon, IconName } from "./Icon";
import { SizeTransition } from "./SizeTransition";
import { ComponentChildren } from "preact";
import { Signalish } from "../utils/signalish";

const VARIANT_CLASSES = {
  primary: "bg-foreground text-background border border-foreground px-2.5",
  secondary: "bg-background text-foreground border px-2.5",
};

export interface BaseButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  iconClassName?: string;
  variant?: keyof typeof VARIANT_CLASSES;
  disabledStyle?: boolean;
  truncate?: boolean;
  icon?: IconName;
}

interface TextButtonProps extends BaseButtonProps {
  children: ComponentChildren;
}

interface IconButtonProps extends BaseButtonProps {
  "aria-label": Signalish<string | undefined>;
}

export type ButtonProps = TextButtonProps | IconButtonProps;

export function Button({
  variant = "secondary",
  children,
  icon,
  className,
  iconClassName,
  truncate = true,
  ...props
}: ButtonProps) {
  const iconOnly = !!icon && !children;

  return (
    <button
      className={clsx(
        "h-9 flex items-center transition-colors text-sm justify-center rounded-full duration-200 focus-ring overflow-hidden select-none",
        VARIANT_CLASSES[variant],
        iconOnly && "min-w-9",
        className
      )}
      type="button"
      {...props}
    >
      {icon && (
        <Icon
          className={clsx(
            "transition-[margin] duration-200",
            iconOnly && "-mx-0.5",
            iconClassName
          )}
          name={icon}
        />
      )}
      <SizeTransition visible={!!children} dep={children}>
        <span className="block whitespace-nowrap max-w-64 truncate px-1.5">
          {children}
        </span>
      </SizeTransition>
    </button>
  );
}
