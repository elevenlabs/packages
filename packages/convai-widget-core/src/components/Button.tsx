import { clsx } from "clsx";
import { ButtonHTMLAttributes, forwardRef } from "preact/compat";
import { Icon, IconName } from "./Icon";
import { SizeTransition } from "./SizeTransition";
import { ComponentChildren } from "preact";
import { Signalish } from "../utils/signalish";

const VARIANT_CLASSES = {
  primary:
    "text-accent-primary border border-accent bg-accent hover:border-accent-hover hover:bg-accent-hover active:border-accent-active active:bg-accent-active",
  secondary:
    "text-base-primary border border-base-border bg-base hover:bg-base-hover active:bg-base-active",
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
    const iconOnly = !!icon && !children;

    return (
      <button
        ref={ref}
        className={clsx(
          "h-9 flex px-2.5 text-sm items-center transition-colors justify-center rounded-button duration-200 focus-ring overflow-hidden select-none",
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
);
