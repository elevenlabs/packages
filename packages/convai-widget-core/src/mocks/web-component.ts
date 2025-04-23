import type { AGENTS } from "./browser";
import { afterEach, beforeAll } from "vitest";
import { CustomAttributes } from "../types/attributes";
import { registerWidget } from "../index";

const MOUNTED_COMPONENTS = new Set<HTMLElement>();

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
}

beforeAll(() => {
  registerWidget();
});
afterEach(() => {
  MOUNTED_COMPONENTS.forEach(element => {
    element.remove();
  });
  MOUNTED_COMPONENTS.clear();
});
