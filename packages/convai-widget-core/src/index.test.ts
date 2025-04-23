import { page } from "@vitest/browser/context";
import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { Worker } from "./mocks/browser";
import { setupWebComponent } from "./mocks/web-component";

describe("elevenlabs-convai", () => {
  beforeAll(() => Worker.start());
  afterAll(() => Worker.stop());

  it("should register a custom component", async () => {
    expect(window.customElements.get("elevenlabs-convai")).toBeDefined();
  });

  it("should display the widget contents", async () => {
    setupWebComponent({ "agent-id": "basic" });
    await expect
      .element(page.getByText("Hello from ConvAI Widget!"))
      .toBeInTheDocument();
  });
});
