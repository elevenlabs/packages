import { page, userEvent } from "vitest/browser";
import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { releaseProducts, Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

function distanceFromBottom(element: Element) {
  const container = element.closest(".overflow-y-auto")!;
  return container.scrollHeight - container.scrollTop - container.clientHeight;
}

describe("Transcript scroll", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  it("follows new content after an upward scroll that went nowhere", async () => {
    setupWebComponent({ "agent-id": "product_carousel", variant: "compact" });

    await page
      .getByRole("textbox", { name: "Text message input" })
      .fill("show me shoes");
    await userEvent.keyboard("{Enter}");

    const reply = page.getByText("Here are some shoes");
    await expect.element(reply).toBeInTheDocument();
    await userEvent.wheel(reply, { direction: "up" });
    releaseProducts();

    await expect.element(page.getByText("Albany")).toBeInTheDocument();
    await expect
      .poll(() => distanceFromBottom(reply.element()))
      .toBeLessThanOrEqual(16);
  });

  it("offers a jump to products that arrive after scrolling up", async () => {
    setupWebComponent({ "agent-id": "product_carousel", variant: "compact" });
    const textInput = page.getByRole("textbox", {
      name: "Text message input",
    });
    const jumpButton = page.getByRole("button", { name: "1 new message" });

    await textInput.fill("show me shoes");
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByText("Here are some shoes"))
      .toBeInTheDocument();
    releaseProducts();
    await expect.element(page.getByText("Albany")).toBeInTheDocument();

    await textInput.fill("show me more");
    await userEvent.keyboard("{Enter}");
    const reply = page.getByText("Here are some shoes").nth(1);
    await expect.element(reply).toBeInTheDocument();
    const container = reply.element().closest(".overflow-y-auto")!;
    const scrolled = new Promise(resolve =>
      container.addEventListener("scroll", resolve, { once: true })
    );
    await userEvent.wheel(container, { delta: { y: -5000 } });
    await scrolled;
    releaseProducts();

    await expect.element(page.getByText("Albany").nth(1)).toBeInTheDocument();
    expect(distanceFromBottom(container)).toBeGreaterThan(16);

    await jumpButton.click();
    await expect
      .poll(() => distanceFromBottom(container))
      .toBeLessThanOrEqual(16);
    await expect.element(jumpButton).not.toBeInTheDocument();
  });
});
