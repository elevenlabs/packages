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
  "md-button":
    "text-base-primary border border-base-border bg-base hover:bg-base-hover active:bg-base-active text-sm h-6",
};

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
        className={cn(
          "h-9 flex px-2.5 text-sm items-center transition-[colors,opacity] justify-center rounded-button duration-200 focus-ring overflow-hidden select-none",
          "disabled:opacity-50 disabled:pointer-events-none",
          VARIANT_CLASSES[variant],
          iconOnly && "min-w-9",
          className
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
          <span
            className={cn(
              "block whitespace-nowrap max-w-64 truncate",
              variant === "md-button" ? "pl-1.5" : "px-1.5"
            )}
            >
            {children}
          </span>
        </SizeTransition>
      </button>
    );
  }
);
