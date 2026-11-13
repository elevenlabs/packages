import { useSignal } from "@preact/signals";
import { clsx } from "clsx";
import { useEffect, useRef } from "preact/compat";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { useTextContents } from "../contexts/text-contents";
import { ButtonGroup, RichContentButton } from "./ButtonGroup";
import { MAX_RATING } from "./validate";

export interface CarouselItem {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  buttons?: RichContentButton[];
}

export interface CarouselProps {
  items: CarouselItem[];
  richContentId?: string;
}

export function Carousel({ items, richContentId }: CarouselProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const activeCard = useSignal(0);
  const scrollable = useSignal(items.length > 1);

  const measure = () => {
    const el = scroller.current;
    if (!el || el.children.length < 2) return;
    const stops = getSnapCenterOffsets(el);
    const maxScroll = el.scrollWidth - el.clientWidth;
    scrollable.value =
      maxScroll >= (el.children[0] as HTMLElement).offsetWidth / 2;
    // Math.abs because scrollLeft is negative in RTL
    const scrolled = Math.abs(el.scrollLeft);
    activeCard.value = stops.reduce(
      (nearest, stop, index) =>
        Math.abs(stop - scrolled) < Math.abs(stops[nearest] - scrolled)
          ? index
          : nearest,
      0
    );
  };

  // Updating mid-swipe makes iOS drop momentum, so wait for scrolling to settle
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = () => {
    if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    settleTimerRef.current = setTimeout(measure, 100);
  };

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);
    return () => {
      resizeObserver.disconnect();
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
    };
  }, []);

  // scrollTo instead of scrollIntoView so ancestor scrollers stay put
  const scrollToCard = (index: number) => {
    const el = scroller.current;
    if (!el) return;
    const offset = getSnapCenterOffsets(el)[index];
    if (offset === undefined) return;
    // Set before scrolling settles so rapid clicks step from the target card
    activeCard.value = index;
    const isRtl = getComputedStyle(el).direction === "rtl";
    el.scrollTo({ left: isRtl ? -offset : offset, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pb-3">
      <div className="relative">
        <div
          ref={scroller}
          onScroll={handleScroll}
          className="flex snap-x snap-mandatory pointer-coarse:snap-none gap-2 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => (
            <div
              key={index}
              className="flex w-72 pointer-coarse:w-60 shrink-0 snap-center flex-col gap-2 rounded-bubble border border-base-border bg-base p-3 text-start"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="aspect-[4/5] w-full rounded-input bg-base-active object-cover"
                />
              )}
              <div className="flex min-w-0 flex-col gap-0.5">
                <span
                  dir="auto"
                  className="text-sm font-medium wrap-break-word"
                >
                  {item.title}
                </span>
                {item.subtitle && (
                  <span dir="auto" className="text-xs text-base-subtle">
                    {item.subtitle}
                  </span>
                )}
                {item.rating !== undefined && (
                  <CardRating
                    rating={item.rating}
                    reviewCount={item.reviewCount}
                  />
                )}
                {item.description && (
                  <span
                    dir="auto"
                    className="text-xs text-base-subtle whitespace-pre-line wrap-break-word"
                  >
                    {item.description}
                  </span>
                )}
              </div>
              {item.buttons && item.buttons.length > 0 && (
                <div className="mt-auto">
                  <ButtonGroup
                    buttons={item.buttons}
                    richContentId={richContentId}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        {scrollable.value && activeCard.value > 0 && (
          <CarouselArrow
            direction="previous"
            onClick={() => scrollToCard(activeCard.value - 1)}
          />
        )}
        {scrollable.value && activeCard.value < items.length - 1 && (
          <CarouselArrow
            direction="next"
            onClick={() => scrollToCard(activeCard.value + 1)}
          />
        )}
      </div>
      {scrollable.value && (
        <div aria-hidden className="flex items-center justify-center gap-1">
          {items.map((_, index) => (
            <span
              key={index}
              className={clsx(
                "h-1.5 rounded-full transition-[width,background-color] duration-200",
                index === activeCard.value
                  ? "w-4 bg-base-primary"
                  : "w-1.5 bg-base-border"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CardRating({
  rating,
  reviewCount,
}: {
  rating: number;
  reviewCount?: number;
}) {
  const formatted = rating.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return (
    <div
      role="img"
      aria-label={`Rating: ${formatted} out of ${MAX_RATING}${reviewCount !== undefined ? `, ${reviewCount} reviews` : ""}`}
      className="flex items-center gap-1.5 text-xs text-base-subtle"
    >
      <span className="flex gap-0.5">
        {Array.from({ length: MAX_RATING }, (_, index) => (
          <Star key={index} fill={Math.min(Math.max(rating - index, 0), 1)} />
        ))}
      </span>
      <span className="text-base-primary">{formatted}</span>
      {reviewCount !== undefined && (
        <span>({reviewCount.toLocaleString()})</span>
      )}
    </div>
  );
}

function Star({ fill }: { fill: number }) {
  return (
    <span className="relative flex shrink-0 text-base-border">
      <Icon name="star" size="xs" />
      {fill > 0 && (
        <span
          className="absolute inset-y-0 start-0 overflow-hidden text-base-primary"
          style={{ width: `${fill * 100}%` }}
        >
          <Icon name="star" size="xs" className="w-max" />
        </span>
      )}
    </span>
  );
}

function getSnapCenterOffsets(el: HTMLElement) {
  const cards = Array.from(el.children) as HTMLElement[];
  const maxScroll = el.scrollWidth - el.clientWidth;
  return cards.map(card => {
    const centered =
      Math.abs(card.offsetLeft - cards[0].offsetLeft) +
      (card.offsetWidth - el.clientWidth) / 2;
    return Math.min(Math.max(centered, 0), maxScroll);
  });
}

function CarouselArrow({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const text = useTextContents();
  const isNext = direction === "next";
  return (
    <Button
      variant="secondary"
      aria-label={isNext ? text.carousel_next : text.carousel_previous}
      onClick={onClick}
      icon="chevron-up"
      iconClassName={
        isNext ? "rotate-90 rtl:-rotate-90" : "-rotate-90 rtl:rotate-90"
      }
      className={clsx(
        "absolute top-1/2 -translate-y-1/2 h-10 w-10 px-0 rounded-full shadow-md pointer-coarse:hidden",
        isNext ? "-end-2" : "-start-2"
      )}
    />
  );
}
