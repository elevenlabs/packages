import { page, userEvent } from "vitest/browser";
import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

describe("Agent message attachments", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  it("renders images inline and other files as download links", async () => {
    setupWebComponent({
      "agent-id": "agent_attachments",
      variant: "compact",
    });

    const textInput = page.getByRole("textbox", {
      name: "Text message input",
    });

    await textInput.fill("send me the receipt");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByText("Here is the receipt you asked for."))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("img", { name: "receipt.svg" }))
      .toBeInTheDocument();

    const pdfLink = page.getByRole("link", { name: "invoice.pdf" });
    await expect.element(pdfLink).toBeInTheDocument();
    await expect
      .element(pdfLink)
      .toHaveAttribute("href", "https://files.convai.test/invoice.pdf");
  });

  it("renders an attachment-only message and drops non-https urls", async () => {
    setupWebComponent({
      "agent-id": "agent_attachments",
      variant: "compact",
    });

    const textInput = page.getByRole("textbox", {
      name: "Text message input",
    });

    await textInput.fill("send me the receipt");
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("img", { name: "receipt.svg" }))
      .toBeInTheDocument();

    // The second reply carries no text at all, so the bubble exists only
    // because of its attachments.
    await textInput.fill("anything else?");
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByRole("img", { name: "diagram.svg" }))
      .toBeInTheDocument();
    await expect
      .element(page.getByRole("img", { name: "leak.png" }))
      .not.toBeInTheDocument();
  });
});
