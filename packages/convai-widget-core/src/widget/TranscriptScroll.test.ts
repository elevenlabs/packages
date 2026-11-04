import { page, userEvent } from "vitest/browser";
import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

function distanceFromBottom(element: Element) {
  const container = element.closest(".overflow-y-auto")!;
  return container.scrollHeight - container.scrollTop - container.clientHeight;
}

describe("Transcript scroll", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  it("follows products that arrive after an upward scroll that went nowhere", async () => {
    setupWebComponent({ "agent-id": "product_carousel", variant: "compact" });

    await page
      .getByRole("textbox", { name: "Text message input" })
      .fill("show me shoes");
    await userEvent.keyboard("{Enter}");

    const reply = page.getByText("Here are some shoes");
    await expect.element(reply).toBeInTheDocument();
    await userEvent.wheel(reply, { direction: "up" });

    await expect.element(page.getByText("Albany")).toBeInTheDocument();
    await expect
      .poll(() => distanceFromBottom(reply.element()))
      .toBeLessThanOrEqual(16);
  });
});
