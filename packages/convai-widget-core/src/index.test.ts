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

  it("should go through a happy path", async () => {
    setupWebComponent({ "agent-id": "basic" });

    const startButton = page.getByRole("button", { name: "Start a call" });
    await expect.element(startButton).toBeInTheDocument();
    await expect.element(page.getByText("Need help?")).toBeInTheDocument();

    await startButton.click();

    const endButton = page.getByRole("button", { name: "End" });
    await expect.element(page.getByText("Listening")).toBeInTheDocument();
    await expect.element(endButton).toBeInTheDocument();

    await endButton.click();

    await expect.element(startButton).toBeInTheDocument();
  });
});
