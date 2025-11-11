import { type Signal, useSignal } from "@preact/signals";
import { clsx } from "clsx";
import { useCallback } from "preact/hooks";
import type { Signalish } from "../utils/signalish";
import { Icon, type IconName } from "./Icon";

const generateRatingValues = (min: number, max: number): number[] =>
  Array.from({ length: max - min + 1 }, (_, i) => i + min);

const RatingIcon = ({
  isFilled,
  iconName,
}: {
  isFilled: boolean;
  iconName: IconName;
}) => {
  return (
    <span
      className={clsx(
        "w-8 h-8 grid place-content-center",
        isFilled ? "text-base-primary" : "text-base-border"
      )}
    >
      <Icon name={iconName} size="lg" />
    </span>
  );
};

const RatingButton = ({
  value,
  rating,
  hoverRating,
  onClick,
  onHover,
  onKeyDown,
  iconName,
}: {
  value: number;
  rating: Signal<number | null>;
  hoverRating: Signal<number | null>;
  onClick: (value: number) => void;
  onHover: (value: number) => void;
  onKeyDown: (e: KeyboardEvent, value: number) => void;
  iconName: IconName;
}) => {
  const isFilled = rating.value !== null && value <= rating.value;
  const isHovered = hoverRating.value !== null && value <= hoverRating.value;

  const handleClick = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onClick(value);
    },
    [onClick, value]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      onKeyDown(e, value);
    },
    [onKeyDown, value]
  );

  return (
    // biome-ignore lint/a11y/useSemanticElements: Custom rating control requires non-standard keyboard behavior
    <button
      type="button"
      role="radio"
      aria-checked={isFilled}
      aria-label={value.toString()}
      onMouseEnter={() => onHover(value)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        "w-8 h-8 grid place-content-center rounded-full focus-ring transition-colors cursor-pointer",
        isFilled || isHovered ? "text-base-primary" : "text-base-border"
      )}
    >
      <Icon name={iconName} size="lg" />
    </button>
  );
};

export const Rating = ({
  onRate,
  min = 1,
  max = 5,
  ariaLabel,
  icon = "star",
}: {
  onRate: (rating: number) => void;
  ariaLabel: Signalish<string>;
  min?: number;
  max?: number;
  icon?: IconName;
}) => {
  const rating = useSignal<number | null>(null);
  const hoverRating = useSignal<number | null>(null);
  const stars = generateRatingValues(min, max);

  const handleHover = useCallback(
    (value: number) => {
      hoverRating.value = value;
    },
    [hoverRating]
  );

  const handleMouseLeave = useCallback(() => {
    hoverRating.value = null;
  }, [hoverRating]);

  const handleClick = useCallback(
    (value: number) => {
      rating.value = value;
      onRate(value);
    },
    [rating, onRate]
  );

  // Custom keyboard handling for the rating control (differ from standard radio group)
  // 1. Enter or Space: Submit the rating
  // 2. Arrow Left or Arrow Down: Focus the previous star w/o select
  // 3. Arrow Right or Arrow Up: Focus the next star w/o select
  const handleKeyDown = useCallback(
    (e: KeyboardEvent, value: number) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        rating.value = value;
        onRate(value);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        const prevValue = value - 1;
        if (prevValue >= min) {
          const target = e.currentTarget as HTMLElement;
          const prevStar = target?.previousElementSibling as HTMLElement;
          prevStar?.focus();
        }
      } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        const nextValue = value + 1;
        if (nextValue <= max) {
          const target = e.currentTarget as HTMLElement;
          const nextStar = target?.nextElementSibling as HTMLElement;
          nextStar?.focus();
        }
      }
    },
    [rating, onRate, min, max]
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex no-wrap cursor-pointer"
      onMouseLeave={handleMouseLeave}
    >
      {stars.map(starValue => (
        <RatingButton
          key={starValue}
          value={starValue}
          rating={rating}
          hoverRating={hoverRating}
          onClick={handleClick}
          onHover={handleHover}
          onKeyDown={handleKeyDown}
          iconName={icon}
        />
      ))}
    </div>
  );
};

export function RatingResult({
  rating,
  min = 1,
  max = 5,
  icon = "star",
}: {
  rating: number;
  min?: number;
  max?: number;
  icon?: IconName;
}) {
  const values = generateRatingValues(min, max);
  return (
    <div
      className="flex no-wrap"
      role="img"
      aria-label={`Rating: ${rating} out of ${max}`}
    >
      {values.map(value => (
        <RatingIcon key={value} isFilled={rating >= value} iconName={icon} />
      ))}
    </div>
  );
}
