import { ComponentChildren } from "preact";
import {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  forwardRef,
} from "preact/compat";
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
  outline:
    "text-accent border border-accent bg-base hover:bg-base-hover active:bg-base-active",
  "md-button":
    "text-base-primary border border-base-border bg-base hover:bg-base-hover active:bg-base-active text-sm h-6",
};

export type ButtonVariant = keyof typeof VARIANT_CLASSES;

type LinkAttributes = Pick<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "download"
>;

export interface BaseButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, LinkAttributes {
  iconClassName?: string;
  variant?: keyof typeof VARIANT_CLASSES;
  disabledStyle?: boolean;
  truncate?: boolean;
  icon?: IconName;
  as?: "button" | "a";
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
      as = "button",
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

    const content = (
      <>
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
      </>
    );

    const classes = cn(
      "h-9 flex px-2.5 text-sm items-center transition-[colors,opacity] justify-center rounded-button duration-200 focus-ring overflow-hidden select-none",
      VARIANT_CLASSES[variant],
      iconOnly && "min-w-9",
      className
    );

    if (as === "a") {
      return (
        <a
          {...(props as unknown as AnchorHTMLAttributes<HTMLAnchorElement>)}
          target="_blank"
          rel="noopener noreferrer"
          className={classes}
        >
          {content}
        </a>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(
          "disabled:opacity-50 disabled:pointer-events-none",
          classes
        )}
        type="button"
        {...props}
      >
        {content}
      </button>
    );
  }
);
