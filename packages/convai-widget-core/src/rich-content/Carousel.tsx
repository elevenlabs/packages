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
}

export function Carousel({
  items,
  richContentId,
  isAnswered,
}: CarouselProps & { richContentId?: string; isAnswered?: boolean }) {
  if (items.length === 0) return null;

  return (
    <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-3">
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
            <span dir="auto" className="text-sm font-medium wrap-break-word">
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
          {!isAnswered && item.buttons && item.buttons.length > 0 && (
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
  );
}
