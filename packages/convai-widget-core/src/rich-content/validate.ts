import type { ItemCardProps, RichContentButton } from "./ItemCard";

const MAX_BUTTONS = 3;
const MAX_TEXT_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseText(value: unknown): string | undefined {
  let text: string;
  if (typeof value === "string") {
    text = value;
  } else if (typeof value === "number" && Number.isFinite(value)) {
    text = String(value);
  } else {
    return undefined;
  }

  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, MAX_TEXT_LENGTH);
}

/**
 * Only remote and inline images are accepted.
 */
function parseImageUrl(value: unknown): string | undefined {
  const raw = parseText(value);
  if (!raw) return undefined;
  if (/^https:\/\//i.test(raw)) return raw;
  if (/^data:image\//i.test(raw)) return raw;
  return undefined;
}

/**
 * A button carries the message it sends. One without a label or a message can do
 * nothing on press, so it is dropped rather than rendered as a dead control.
 */
function parseButtons(value: unknown): RichContentButton[] {
  if (!Array.isArray(value)) return [];

  const buttons: RichContentButton[] = [];
  for (const item of value) {
    if (buttons.length >= MAX_BUTTONS) break;
    if (!isRecord(item)) continue;

    const label = parseText(item.label);
    if (!label) continue;

    const message = parseText(item.message);
    if (message) {
      buttons.push({ label, message });
    }
  }
  return buttons;
}

/**
 * Properties arrive from the agent, so they are malformed by default rather
 * than exceptionally. Returns null when the component cannot be rendered
 * meaningfully, which the caller turns into a fallback rather than a throw.
 */
export function parseItemCardProps(value: unknown): ItemCardProps | null {
  if (!isRecord(value)) return null;

  const id = parseText(value.id);
  const title = parseText(value.title);
  if (!(id && title)) return null;

  return {
    id,
    title,
    subtitle: parseText(value.subtitle),
    imageUrl: parseImageUrl(value.image_url ?? value.imageUrl),
    description: parseText(value.description),
    price: parseText(value.price),
    buttons: parseButtons(value.buttons),
  };
}
