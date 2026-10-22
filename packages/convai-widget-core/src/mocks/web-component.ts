import type { AGENTS } from "./browser";
import { afterEach, beforeAll } from "vitest";
import { page } from "vitest/browser";
import { CustomAttributes } from "../types/attributes";
import { registerWidget } from "../index";

const MOUNTED_COMPONENTS = new Set<HTMLElement>();
const VITEST_DEFAULT_VIEWPORT = [414, 896] as const;

export function setupWebComponent(
  attributes: CustomAttributes & { "agent-id": keyof typeof AGENTS }
) {
  const element = document.createElement("elevenlabs-convai");
  // We override the default "fixed" position to avoid issues with playwright
  // considering the widget to be out of the viewport.
  element.style.position = "absolute";
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  MOUNTED_COMPONENTS.add(element);
  document.body.appendChild(element);
  return element;
}

beforeAll(() => {
  registerWidget();
});
afterEach(async () => {
  await page.viewport(...VITEST_DEFAULT_VIEWPORT);
  MOUNTED_COMPONENTS.forEach(element => {
    element.remove();
  });
  MOUNTED_COMPONENTS.clear();
});
