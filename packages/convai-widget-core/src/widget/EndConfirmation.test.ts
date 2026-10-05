import { page, userEvent } from "vitest/browser";
import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";
import { CustomAttributes } from "../types/attributes";

async function startCall(attributes: Omit<CustomAttributes, "agent-id"> = {}) {
  setupWebComponent({
    "agent-id": "basic",
    "end-confirmation": "true",
    ...attributes,
  });
  await startCallButton().click();
  await page.getByRole("button", { name: "Accept" }).click();
}

const startCallButton = () =>
  page.getByRole("button", { name: "Start a call" });
const endButton = () => page.getByRole("button", { name: "End", exact: true });
const dialog = () => page.getByRole("alertdialog");

describe("End confirmation", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  it("should confirm before ending a call", async () => {
    await startCall();

    await endButton().click();
    await dialog().getByRole("button", { name: "Cancel" }).click();
    await expect.element(dialog()).not.toBeInTheDocument();

    await endButton().click();
    await expect.element(dialog()).toHaveAccessibleName("End this call?");
    await dialog().getByRole("button", { name: "End call" }).click();
    await expect.element(startCallButton()).toBeInTheDocument();
  });

  it("should unmount when dismissed during the fade-in", async () => {
    await startCall({ transcript: "true" });

    await endButton().click();
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog()).not.toBeInTheDocument();

    // The sheet is interactive again
    await endButton().click();
    await dialog().getByRole("button", { name: "End call" }).click();
    await expect.element(startCallButton()).toBeInTheDocument();
  });

  it("should ignore the confirm button while fading out", async () => {
    await startCall({ transcript: "true" });

    await endButton().click();
    await expect.element(dialog()).toBeVisible();
    const [cancelButton, confirmButton] = Array.from(
      dialog().element().querySelectorAll("button")
    );
    cancelButton.click();
    confirmButton.click();

    // Give a wrongly ended session time to disconnect
    await new Promise(resolve => setTimeout(resolve, 500));
    await expect.element(endButton()).toBeInTheDocument();
  });

  it("should dismiss when the sheet is collapsed", async () => {
    await startCall({ transcript: "true" });

    await endButton().click();
    await expect.element(dialog()).toBeVisible();
    await page.getByRole("button", { name: "Collapse" }).click();

    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(endButton()).toBeInTheDocument();
  });

  it("should confirm before ending a text chat", async () => {
    setupWebComponent({
      "agent-id": "text_only_persistent",
      "end-confirmation": "true",
    });
    await page
      .getByRole("textbox", { name: "Text message input" })
      .fill("Text message");
    await userEvent.keyboard("{Enter}");
    await expect
      .element(page.getByText("Chatting with AI agent"))
      .toBeInTheDocument();

    await page.getByRole("button", { name: "End chat", exact: true }).click();
    await expect.element(dialog()).toHaveAccessibleName("End this chat?");
    await dialog().getByRole("button", { name: "End chat" }).click();
    await expect
      .element(page.getByText("You ended the conversation"))
      .toBeInTheDocument();
  });

  it("should dismiss when the agent ends the session", async () => {
    setupWebComponent({
      "agent-id": "text_only",
      "end-confirmation": "true",
      "default-expanded": "true",
      transcript: "true",
      "text-input": "true",
    });
    const sendMessage = async () => {
      await page
        .getByRole("textbox", { name: "Text message input" })
        .fill("Text message");
      await userEvent.keyboard("{Enter}");
    };

    await sendMessage();
    await page.getByRole("button", { name: "Accept" }).click();
    await page.getByRole("button", { name: "End chat", exact: true }).click();
    await expect.element(dialog()).toBeVisible();

    await expect
      .element(page.getByText("The agent ended the conversation"))
      .toBeInTheDocument();
    await expect.element(dialog()).not.toBeInTheDocument();

    // A new session must not resurface the stale request
    await sendMessage();
    await expect
      .element(
        page.getByRole("button", { name: "End chat", exact: true }).first()
      )
      .toBeInTheDocument();
    expect(dialog().elements()).toHaveLength(0);
  });

  it("should use custom text contents", async () => {
    await startCall({
      "text-contents": JSON.stringify({
        end_call_confirmation_title: "¿Terminar la llamada?",
        end_call_confirm: "Terminar",
      }),
    });

    await endButton().click();
    await expect
      .element(dialog())
      .toHaveAccessibleName("¿Terminar la llamada?");
    await dialog().getByRole("button", { name: "Terminar" }).click();
    await expect.element(startCallButton()).toBeInTheDocument();
  });
});
