import * as z from "zod/mini";
import type { ButtonGroupProps, RichContentButton } from "./ButtonGroup";

const MAX_BUTTONS = 3;
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

export function parseButtonGroupProps(value: unknown): ButtonGroupProps | null {
  const parsed = z.safeParse(
    z.object({ buttons: z.array(z.unknown()) }),
    value
  );
  if (!parsed.success) return null;

  const buttons: RichContentButton[] = [];
  for (const item of parsed.data.buttons) {
    if (buttons.length >= MAX_BUTTONS) break;

    const button = z.safeParse(Button, item);
    if (button.success) buttons.push(button.data);
  }

  return buttons.length > 0 ? { buttons } : null;
}
