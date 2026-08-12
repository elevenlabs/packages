import { ComponentChildren } from "preact";
import { ButtonHTMLAttributes, forwardRef } from "preact/compat";
import { cn } from "../utils/cn";
import { Signalish } from "../utils/signalish";
import { Icon, IconName } from "./Icon";
import { SizeTransition } from "./SizeTransition";

const VARIANT_CLASSES = {
  primary:
    "text-accent-primary border border-accent bg-accent hover:border-accent-hover hover:bg-accent-hover active:border-accent-active active:bg-accent-active",
  secondary:
    "text-base-primary border border-base-border bg-base hover:bg-base-hover active:bg-base-active",
  ghost:
    "text-base-primary border border-base bg-base hover:bg-base-hover hover:border-base-hover active:bg-base-active active:border-base-active",
  // Accent coloured but not filled. Reserves solid accent for what the user
  // actually said, so a tappable suggestion is never mistaken for their own
  // message bubble.
  outline:
    "text-accent border border-accent bg-base hover:bg-base-hover active:bg-base-active",
  "md-button":
    "text-base-primary border border-base-border bg-base hover:bg-base-hover active:bg-base-active text-sm h-6",
};

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

/**
 * The classes Button puts on its own element, for the rare caller that has to
 * render something other than a <button> — an anchor, say — and still look
 * identical. Exported as a function rather than the class strings themselves
 * so layout and variant can only ever be changed in one place.
 */
export function buttonClassName(
  variant: ButtonVariant = "secondary",
  className?: string
) {
  return cn(
    "h-9 flex px-2.5 text-sm items-center transition-[colors,opacity] justify-center rounded-button duration-200 focus-ring overflow-hidden select-none",
    VARIANT_CLASSES[variant],
    className
  );
}

/** Matches the label Button wraps its children in. */
export function buttonLabelClassName(variant?: ButtonVariant) {
  return cn(
    "block whitespace-nowrap max-w-64 truncate",
    variant === "md-button" ? "pl-1.5" : "px-1.5"
  );
}

export interface BaseButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
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

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      children,
      icon,
      className,
      iconClassName,
      truncate = true,
      ...props
    },
    ref
  ) {
    const hasIcon = !!icon;
    const iconOnly = hasIcon && !children;

    return (
      <button
        ref={ref}
        className={buttonClassName(
          variant,
          cn(
            "disabled:opacity-50 disabled:pointer-events-none",
            iconOnly && "min-w-9",
            className
          )
        )}
        type="button"
        {...props}
      >
        {icon && (
          <Icon
            className={cn(
              "transition-[margin] duration-200",
              iconOnly && "-mx-0.5",
              variant === "md-button" && "text-sm",
              iconClassName
            )}
            name={icon}
          />
        )}
        <SizeTransition visible={!!children} dep={children}>
          <span className={buttonLabelClassName(variant)}>{children}</span>
        </SizeTransition>
      </button>
    );
  }
);
