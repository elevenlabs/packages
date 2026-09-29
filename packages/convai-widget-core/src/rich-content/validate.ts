import * as z from "zod/mini";
import type { ButtonGroupProps, RichContentButton } from "./ButtonGroup";
import type { CarouselItem, CarouselProps } from "./Carousel";

const MAX_BUTTONS = 3;
const MAX_CAROUSEL_ITEMS = 5;
const MAX_TEXT_LENGTH = 500;
const MAX_URL_LENGTH = 2048;

const Text = z.pipe(
  z.pipe(
    z.union([z.string(), z.number()]),
    z.transform(value => String(value).trim())
  ),
  z.string().check(
    z.minLength(1),
    z.overwrite(text => text.slice(0, MAX_TEXT_LENGTH))
  )
);

const Link = z.pipe(
  z.pipe(
    z.string(),
    z.transform(value => value.trim())
  ),
  z.string().check(z.maxLength(MAX_URL_LENGTH), z.regex(/^https:\/\//i))
);

// Drop a malformed optional field instead of rejecting its parent.
const Optional = <T extends z.ZodMiniType>(schema: T) =>
  z.catch(z.nullish(schema), undefined);

const MessageButton = z.pipe(
  z.object({
    type: z.nullish(z.literal("message")),
    label: Text,
    message: Text,
  }),
  z.transform(
    (button): RichContentButton => ({
      type: "message",
      label: button.label,
      message: button.message,
    })
  )
);

const LinkButton = z.object({
  type: z.literal("link"),
  label: Text,
  link: Link,
});

const Button = z.union([MessageButton, LinkButton]);

function parseButtons(raw: unknown[]): RichContentButton[] {
  const buttons: RichContentButton[] = [];
  for (const item of raw) {
    if (buttons.length >= MAX_BUTTONS) break;

    const button = z.safeParse(Button, item);
    if (button.success) buttons.push(button.data);
  }
  return buttons;
}

export function parseButtonGroupProps(value: unknown): ButtonGroupProps | null {
  const parsed = z.safeParse(
    z.object({ buttons: z.array(z.unknown()) }),
    value
  );
  if (!parsed.success) return null;

  const buttons = parseButtons(parsed.data.buttons);
  return buttons.length > 0 ? { buttons } : null;
}

const CarouselItemSchema = z.pipe(
  z.object({
    title: Text,
    subtitle: Optional(Text),
    description: Optional(Text),
    image_url: Optional(Link),
    buttons: z.catch(z.nullish(z.array(z.unknown())), undefined),
  }),
  z.transform((item): CarouselItem => {
    const card: CarouselItem = { title: item.title };
    if (item.subtitle) card.subtitle = item.subtitle;
    if (item.description) card.description = item.description;
    if (item.image_url) card.imageUrl = item.image_url;

    const buttons = parseButtons(item.buttons ?? []);
    if (buttons.length > 0) card.buttons = buttons;

    return card;
  })
);

export function parseCarouselProps(value: unknown): CarouselProps | null {
  const parsed = z.safeParse(z.object({ items: z.array(z.unknown()) }), value);
  if (!parsed.success) return null;

  const items: CarouselItem[] = [];
  for (const raw of parsed.data.items) {
    if (items.length >= MAX_CAROUSEL_ITEMS) break;

    const item = z.safeParse(CarouselItemSchema, raw);
    if (item.success) items.push(item.data);
  }

  return items.length > 0 ? { items } : null;
}
