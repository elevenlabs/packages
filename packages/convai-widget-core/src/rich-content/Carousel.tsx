import { useSignal } from "@preact/signals";
import { clsx } from "clsx";
import { useRef } from "preact/compat";
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
  const activeIndex = useSignal(0);

  const handleScroll = () => {
    const el = scroller.current;
    if (!el || el.children.length < 2) return;
    const [first, second] = el.children as unknown as HTMLElement[];
    const step = Math.abs(second.offsetLeft - first.offsetLeft);
    // Math.abs because scrollLeft is negative in RTL
    const scrolled = Math.abs(el.scrollLeft);
    const atEnd = scrolled + el.clientWidth >= el.scrollWidth - 1;
    activeIndex.value = atEnd ? items.length - 1 : Math.round(scrolled / step);
  };

  const scrollToCard = (index: number) => {
    const card = scroller.current?.children[index];
    card?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  };

  if (items.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 pb-3">
      <div className="relative">
        <div
          ref={scroller}
          onScroll={handleScroll}
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
        {activeIndex.value > 0 && (
          <CarouselEdge
            direction="previous"
            onClick={() => scrollToCard(activeIndex.value - 1)}
          />
        )}
        {activeIndex.value < items.length - 1 && (
          <CarouselEdge
            direction="next"
            onClick={() => scrollToCard(activeIndex.value + 1)}
          />
        )}
      </div>
      {items.length > 1 && (
        <div aria-hidden className="flex items-center justify-center gap-1">
          {items.map((_, index) => (
            <span
              key={index}
              className={clsx(
                "h-1.5 rounded-full transition-[width,background-color] duration-200",
                index === activeIndex.value
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

function CarouselEdge({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const text = useTextContents();
  const isNext = direction === "next";
  return (
    <>
      {/* Only the next side fades; a snapped card sits flush with the start edge */}
      {isNext && (
        <div className="pointer-events-none absolute inset-y-0 end-0 w-10 bg-linear-to-l from-base to-transparent rtl:bg-linear-to-r" />
      )}
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
    </>
  );
}
