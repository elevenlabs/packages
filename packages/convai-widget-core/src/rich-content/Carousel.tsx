import { useSignal } from "@preact/signals";
import { clsx } from "clsx";
import { useEffect, useRef } from "preact/compat";
import { Button } from "../components/Button";
import { Icon } from "../components/Icon";
import { useTextContents } from "../contexts/text-contents";
import { ButtonGroup, RichContentButton } from "./ButtonGroup";

export interface CarouselItem {
  title: string;
  subtitle?: string;
  description?: string;
  imageUrl?: string;
  buttons?: RichContentButton[];
}

export interface CarouselProps {
  items: CarouselItem[];
  richContentId?: string;
}

export function Carousel({ items, richContentId }: CarouselProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const activePage = useSignal(0);
  const pageCount = useSignal(items.length);

  const measure = () => {
    const el = scroller.current;
    if (!el || el.children.length < 2) return;
    const [first, second] = el.children as unknown as HTMLElement[];
    const step = Math.abs(second.offsetLeft - first.offsetLeft);
    const maxScroll = el.scrollWidth - el.clientWidth;
    // Folds a leftover shorter than half a card into the last page
    const pages = Math.round(maxScroll / step) + 1;
    // Math.abs because scrollLeft is negative in RTL
    const scrolled = Math.abs(el.scrollLeft);
    pageCount.value = pages;
    activePage.value =
      scrolled >= maxScroll - 1
        ? pages - 1
        : Math.min(Math.round(scrolled / step), pages - 1);
  };

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, []);

  const scrollToPage = (page: number) => {
    const cards = scroller.current?.children;
    if (!cards) return;
    const isLast = page === pageCount.value - 1;
    cards[isLast ? cards.length - 1 : page]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: isLast ? "end" : "start",
    });
  };

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pb-3">
      <div className="relative">
        <div
          ref={scroller}
          onScroll={measure}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {items.map((item, index) => (
            <div
              key={index}
              className="flex w-72 shrink-0 snap-start flex-col gap-2 rounded-bubble border border-base-border bg-base p-3 text-start"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  loading="lazy"
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
        {activePage.value > 0 && (
          <CarouselArrow
            direction="previous"
            onClick={() => scrollToPage(activePage.value - 1)}
          />
        )}
        {activePage.value < pageCount.value - 1 && (
          <CarouselArrow
            direction="next"
            onClick={() => scrollToPage(activePage.value + 1)}
          />
        )}
      </div>
      {pageCount.value > 1 && (
        <div aria-hidden className="flex items-center justify-center gap-1">
          {Array.from({ length: pageCount.value }, (_, index) => (
            <span
              key={index}
              className={clsx(
                "h-1.5 rounded-full transition-[width,background-color] duration-200",
                index === activePage.value
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
      className={clsx(
        "absolute top-1/2 -translate-y-1/2 h-10 w-10 px-0 rounded-full shadow-md",
        isNext ? "-end-2" : "-start-2"
      )}
    >
      <Icon
        name="chevron-up"
        className={
          isNext ? "rotate-90 rtl:-rotate-90" : "-rotate-90 rtl:rotate-90"
        }
      />
    </Button>
  );
}
