import type { ButtonGroupProps, RichContentButton } from "./ButtonGroup";

const MAX_BUTTONS = 3;
const MAX_TEXT_LENGTH = 500;
const MAX_URL_LENGTH = 2048;

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

function isHttpsUrl(raw: string): boolean {
  return /^https:\/\//i.test(raw);
}

function parseLink(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const raw = value.trim();
  if (!raw || raw.length > MAX_URL_LENGTH) return undefined;
  return isHttpsUrl(raw) ? raw : undefined;
}

function parseButton(
  item: Record<string, unknown>
): RichContentButton | undefined {
  const label = parseText(item.label);
  if (!label) return undefined;

  const type = item.type ?? "message";
  if (type === "link") {
    const link = parseLink(item.link);
    return link ? { type: "link", label, link } : undefined;
  }
  if (type === "message") {
    const message = parseText(item.message);
    return message ? { type: "message", label, message } : undefined;
  }
  return undefined;
}

function parseButtons(value: unknown): RichContentButton[] {
  if (!Array.isArray(value)) return [];

  const buttons: RichContentButton[] = [];
  for (const item of value) {
    if (buttons.length >= MAX_BUTTONS) break;
    if (!isRecord(item)) continue;

    const button = parseButton(item);
    if (button) buttons.push(button);
  }
  return buttons;
}

export function parseButtonGroupProps(value: unknown): ButtonGroupProps | null {
  if (!isRecord(value)) return null;

  const buttons = parseButtons(value.buttons);
  if (buttons.length === 0) return null;

  return { buttons };
}
