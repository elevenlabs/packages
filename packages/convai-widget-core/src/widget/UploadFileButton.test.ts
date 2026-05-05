import { page, userEvent } from "@vitest/browser/context";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

describe("Upload File Button", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  // Trigger session start by sending a first text message. Upload UI is gated
  // on !isDisconnected, so we need a live conversation before the attach
  // button can appear.
  async function connect() {
    const textInput = page.getByRole("textbox", {
      name: "Text message input",
    });
    await textInput.fill("hi");
    await userEvent.keyboard("{Enter}");
    await expect.element(page.getByText("hi")).toBeInTheDocument();
  }

  function getHiddenFileInput(widget: HTMLElement): HTMLInputElement {
    const input =
      widget.shadowRoot?.querySelector<HTMLInputElement>('input[type="file"]');
    if (!input) throw new Error("hidden file input not found");
    return input;
  }

  it("does not render the attach button when file_input_config.enabled is false", async () => {
    setupWebComponent({ "agent-id": "no_file_upload" });
    await connect();

    await expect
      .element(page.getByRole("button", { name: "Attach file" }))
      .not.toBeInTheDocument();
  });

  // The attach button becomes visible as soon as the session leaves the
  // "disconnected" state, but `addFile` silently no-ops until `status ===
  // "connected"` (that's when conversationId is exposed). Waiting for the
  // button to be not-disabled is the visible proxy for that transition.
  async function waitForUploadReady() {
    const attach = page.getByRole("button", { name: "Attach file" });
    await expect.element(attach).toBeVisible();
    await expect.element(attach).not.toBeDisabled();
  }

  it("shows a preview and enables send after a successful upload", async () => {
    const widget = setupWebComponent({ "agent-id": "file_upload" });
    await connect();
    await waitForUploadReady();

    const input = getHiddenFileInput(widget);
    await userEvent.upload(
      input,
      new File(["hello"], "photo.png", { type: "image/png" })
    );

    await expect.element(page.getByText("photo.png")).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: "Send" }))
      .not.toBeDisabled();
  });

  it("removes the pending file when Remove file is clicked", async () => {
    const widget = setupWebComponent({ "agent-id": "file_upload" });
    await connect();
    await waitForUploadReady();

    const input = getHiddenFileInput(widget);
    await userEvent.upload(
      input,
      new File(["x"], "doc.pdf", { type: "application/pdf" })
    );

    await expect.element(page.getByText("doc.pdf")).toBeVisible();

    await page.getByRole("button", { name: "Remove file" }).click();

    await expect.element(page.getByText("doc.pdf")).not.toBeInTheDocument();
  });
});
