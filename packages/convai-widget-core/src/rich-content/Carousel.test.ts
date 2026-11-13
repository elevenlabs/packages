import { page, userEvent } from "vitest/browser";
import { describe, it, beforeAll, expect, afterAll, beforeEach } from "vitest";
import { releaseProducts, Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

function setSheetOpen(open: boolean) {
  document.dispatchEvent(
    new CustomEvent("elevenlabs-agent:expand", {
      detail: { action: open ? "expand" : "collapse" },
      bubbles: true,
      composed: true,
    })
  );
}

async function askForBoots() {
  await page
    .getByRole("textbox", { name: "Text message input" })
    .fill("show me boots");
  await userEvent.keyboard("{Enter}");
  const title = page.getByText("Albany");
  await expect.element(title).toBeInTheDocument();
  return title.element();
}

describe("Carousel", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());
  beforeEach(() => page.viewport(1280, 800));

  it("expands on reopening for cards that arrived while it was closed", async () => {
    setupWebComponent({
      "agent-id": "product_carousel",
      variant: "compact",
      "expand-on-carousel": "true",
    });
    await page
      .getByRole("textbox", { name: "Text message input" })
      .fill("show me shoes");
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByText("Here are some shoes"))
      .toBeInTheDocument();

    setSheetOpen(false);
    releaseProducts();
    const title = page.getByText("Albany");
    await expect.element(title).toBeInTheDocument();
    setSheetOpen(true);

    await expect
      .poll(() =>
        title.element().closest(".sheet")!.getAttribute("data-variant")
      )
      .toBe("expanded");
  });

  it("stays compact once the user collapses it", async () => {
    setupWebComponent({
      "agent-id": "product_cards",
      variant: "compact",
      "expand-on-carousel": "true",
    });
    await askForBoots();
    await page.getByRole("button", { name: "Collapse widget" }).click();

    await page
      .getByRole("textbox", { name: "Text message input" })
      .fill("show me more");
    await userEvent.keyboard("{Enter}");
    const title = page.getByText("Albany").nth(1);
    await expect.element(title).toBeInTheDocument();

    expect(
      title.element().closest(".sheet")!.getAttribute("data-variant")
    ).toBe("compact");
  });

  it("stays compact by default, with cards that fit", async () => {
    setupWebComponent({ "agent-id": "product_cards", variant: "compact" });

    const title = await askForBoots();

    const card = title.closest(".snap-center")!;
    await expect
      .poll(() => card.querySelector("img")?.naturalWidth)
      .toBeGreaterThan(0);
    expect(card.closest(".sheet")!.getAttribute("data-variant")).toBe(
      "compact"
    );
    // Buttons animate their label in, so wait for the layout to settle
    await expect
      .poll(() => card.getBoundingClientRect().height)
      .toBeLessThanOrEqual(card.closest(".overflow-y-auto")!.clientHeight);
  });
});
