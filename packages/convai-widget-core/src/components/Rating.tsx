import { useSignal } from "@preact/signals";
import { clsx } from "clsx";
import { Icon, type IconName } from "./Icon";
import { Signalish } from "../utils/signalish";

const generateRatingValues = (min: number, max: number): number[] =>
  Array.from({ length: max - min + 1 }, (_, i) => i + min);

interface RatingIconProps {
  isFilled: boolean;
  iconName: IconName;
}

const RatingIcon = ({ isFilled, iconName }: RatingIconProps) => {
  const className = clsx(
    "w-8 h-8 grid place-content-center",
    isFilled ? "text-base-primary" : "text-base-subtle"
  );

  return (
    <span className={className}>
      <Icon name={iconName} size="lg" />
    </span>
  );
};

interface RatingButtonProps {
  value: number;
  isFilled: boolean;
  isHovered: boolean;
  onClick: (value: number) => void;
  onHover: (value: number) => void;
  onKeyDown: (e: KeyboardEvent, value: number) => void;
  iconName: IconName;
}

const RatingButton = ({
  value,
  isFilled,
  isHovered,
  onClick,
  onHover,
  onKeyDown,
  iconName,
}: RatingButtonProps) => {
  const handleClick = (e: MouseEvent) => {
    e.stopPropagation();
    onClick(value);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    onKeyDown(e, value);
  };

  const className = clsx(
    "w-8 h-8 grid place-content-center transition-colors",
    isFilled || isHovered ? "text-base-primary" : "text-base-subtle"
  );

  return (
    <span
      role="radio"
      aria-checked={isFilled}
      aria-label={`${value} star${value !== 1 ? "s" : ""}`}
      tabIndex={0}
      onMouseEnter={() => onHover(value)}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={className}
    >
      <Icon name={iconName} size="lg" />
    </span>
  );
};

interface RatingProps {
  rating: number | null;
  onRate: (rating: number) => void;
  ariaLabel: Signalish<string>;
  min?: number;
  max?: number;
  icon?: IconName;
}

export const Rating = ({
  rating,
  onRate,
  min = 1,
  max = 5,
  ariaLabel,
  icon = "star",
}: RatingProps) => {
  const hoverRating = useSignal<number | null>(null);
  const stars = generateRatingValues(min, max);

  const handleHover = (value: number) => {
    hoverRating.value = value;
  };

  const handleMouseLeave = () => {
    hoverRating.value = null;
  };

  const handleClick = (value: number) => {
    onRate(value);
  };

  const handleKeyDown = (e: KeyboardEvent, value: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
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
  };

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
          isFilled={rating !== null && starValue <= rating}
          isHovered={hoverRating.value !== null && starValue <= hoverRating.value}
          onClick={handleClick}
          onHover={handleHover}
          onKeyDown={handleKeyDown}
          iconName={icon}
        />
      ))}
    </div>
  );
};


interface RatingResultProps {
  rating: number;
  min?: number;
  max?: number;
  icon?: IconName;
}

export const RatingResult = ({
  rating,
  min = 1,
  max = 5,
  icon = "star",
}: RatingResultProps) => {
  const values = generateRatingValues(min, max);
  return (
    <div
      className="flex no-wrap"
      role="img"
      aria-label={`Rating: ${rating} out of ${max}`}
    >
      {values.map((value) => (
        <RatingIcon key={value} isFilled={rating >= value} iconName={icon} />
      ))}
    </div>
  );
};