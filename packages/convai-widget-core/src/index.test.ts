import { page, userEvent } from "@vitest/browser/context";
import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { Worker } from "./mocks/browser";
import { setupWebComponent } from "./mocks/web-component";
import { Variants } from "./types/config";

describe("elevenlabs-convai", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  it("should register a custom component", async () => {
    expect(window.customElements.get("elevenlabs-convai")).toBeDefined();
  });

  it.each(Variants)(
    "$0 variant should go through a happy path",
    async variant => {
      setupWebComponent({ "agent-id": "basic", variant });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      await expect.element(page.getByText("Test terms")).toBeInTheDocument();
      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      const endButton = page.getByRole("button", { name: "End", exact: true });
      await endButton.click();

      await expect.element(startButton).toBeInTheDocument();
    }
  );

  it.each(Variants)(
    "$0 expandable variant should go through a happy path",
    async variant => {
      setupWebComponent({
        "agent-id": "basic",
        transcript: "true",
        "text-input": "true",
        variant,
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      await expect.element(page.getByText("Test terms")).toBeInTheDocument();
      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      await startButton.click();

      // Status badge
      await expect.element(page.getByText("Connecting")).toBeInTheDocument();
      await expect.element(page.getByText("Listening")).toBeInTheDocument();

      // Received transcript
      await expect
        .element(page.getByText("Agent response"))
        .toBeInTheDocument();
      await expect
        .element(page.getByText("User transcript"))
        .toBeInTheDocument();

      // Text input
      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("Text message");
      await userEvent.keyboard("{Enter}");
      await expect.element(page.getByText("Text message")).toBeInTheDocument();

      const endButton = page.getByRole("button", { name: "End", exact: true });
      await endButton.click();

      await expect
        .element(page.getByText("You ended the conversation"))
        .toBeInTheDocument();
      await expect.element(page.getByText("ID")).toBeInTheDocument();
      await expect.element(startButton).toBeInTheDocument();

      // Restarting via text-input
      await textInput.fill("New text message");
      await userEvent.keyboard("{Enter}");
      await expect
        .element(page.getByText("New text message"))
        .toBeInTheDocument();

      // Established connection
      await expect
        .element(page.getByText("Chatting with AI agent"))
        .toBeInTheDocument();
    }
  );

  it.each(Variants)(
    "$0 expandable variant should go through a happy path (text-only)",
    async variant => {
      setupWebComponent({
        "agent-id": "text_only",
        variant,
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      await expect.element(page.getByText("Test terms")).toBeInTheDocument();
      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      // Displayed first message
      await expect
        .element(page.getByText("Agent response"))
        .toBeInTheDocument();

      // Text input
      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("Text message");
      await userEvent.keyboard("{Enter}");
      await expect.element(page.getByText("Text message")).toBeInTheDocument();

      // Established connection
      await expect.element(page.getByText("Connecting")).toBeInTheDocument();
      await expect
        .element(page.getByText("Chatting with AI agent"))
        .toBeInTheDocument();

      // Received another agent message
      await expect
        .element(page.getByText("Another agent response"))
        .toBeInTheDocument();

      // Agent closed the connection
      await expect
        .element(page.getByText("The agent ended the conversation"))
        .toBeInTheDocument();
      await expect.element(page.getByText("ID")).toBeInTheDocument();
    }
  );

  it.each(Variants)("$0 variant should handle errors", async variant => {
    setupWebComponent({ "agent-id": "basic", variant });

    const startButton = page.getByRole("button", { name: "Start a call" });
    await startButton.click();

    const acceptButton = page.getByRole("button", { name: "Accept" });
    await acceptButton.click();

    const endButton = page.getByRole("button", { name: "End" });
    await endButton.click();

    await expect.element(startButton).toBeInTheDocument();
  });

  it.each(Variants)(
    "$0 expandable variant should handle errors",
    async variant => {
      setupWebComponent({
        "agent-id": "fail",
        transcript: "true",
        "text-input": "true",
        variant,
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      await startButton.click();

      // Received transcript
      await expect
        .element(page.getByText("Agent response"))
        .toBeInTheDocument();
      await expect
        .element(page.getByText("User transcript"))
        .toBeInTheDocument();

      // Displayed error
      await expect
        .element(page.getByText("An error occurred"))
        .toBeInTheDocument();
      await expect.element(page.getByText("Test reason")).toBeInTheDocument();
      await expect.element(page.getByText("ID")).toBeInTheDocument();
      await expect.element(startButton).toBeInTheDocument();
    }
  );

  describe("expansion events", () => {
    it("should expand and collapse widget when elevenlabs-agent:expand event is dispatched", async () => {
      setupWebComponent({
        "agent-id": "basic",
        "text-input": "true",
        variant: "compact",
      });

      // Initially, the widget should not be expanded
      await expect
        .element(page.getByRole("button", { name: "Start a call" }))
        .toBeInTheDocument();

      // Dispatch expand event
      const expandEvent = new CustomEvent("elevenlabs-agent:expand", {
        detail: { action: "expand" },
        bubbles: true,
        composed: true,
      });
      document.dispatchEvent(expandEvent);

      // The widget should now be expanded (Sheet should be visible)
      // We can check for the presence of the text input which is only visible when expanded
      await expect
        .element(page.getByRole("textbox", { name: "Text message input" }))
        .toBeInTheDocument();

      // Now collapse it
      const collapseEvent = new CustomEvent("elevenlabs-agent:expand", {
        detail: { action: "collapse" },
        bubbles: true,
        composed: true,
      });
      document.dispatchEvent(collapseEvent);

      // The text input should no longer be visible
      await expect
        .element(page.getByRole("textbox", { name: "Text message input" }))
        .not.toBeInTheDocument();
    });

    it("should toggle widget when elevenlabs-agent:expand event is dispatched with toggle action", async () => {
      setupWebComponent({
        "agent-id": "basic",
        transcript: "true",
        "text-input": "true",
        variant: "compact",
      });

      // Initially collapsed
      await expect
        .element(page.getByRole("button", { name: "Start a call" }))
        .toBeInTheDocument();

      // First toggle - should expand
      const toggleEvent1 = new CustomEvent("elevenlabs-agent:expand", {
        detail: { action: "toggle" },
        bubbles: true,
        composed: true,
      });
      document.dispatchEvent(toggleEvent1);

      // Should be expanded now
      await expect
        .element(page.getByRole("textbox", { name: "Text message input" }))
        .toBeInTheDocument();

      // Second toggle - should collapse
      const toggleEvent2 = new CustomEvent("elevenlabs-agent:expand", {
        detail: { action: "toggle" },
        bubbles: true,
        composed: true,
      });
      document.dispatchEvent(toggleEvent2);

      // Should be collapsed now
      await expect
        .element(page.getByRole("textbox", { name: "Text message input" }))
        .not.toBeInTheDocument();
    });

    it("should not expand widget when it's not expandable (no transcript or text input)", async () => {
      setupWebComponent({
        "agent-id": "basic",
        variant: "compact",
        // No transcript or text-input enabled
      });

      // Dispatch expand event
      const expandEvent = new CustomEvent("elevenlabs-agent:expand", {
        detail: { action: "expand" },
        bubbles: true,
        composed: true,
      });
      document.dispatchEvent(expandEvent);

      // Widget should remain in its original state (not expanded)
      // The text input should not be present since the widget is not expandable
      await expect
        .element(page.getByRole("textbox", { name: "Text message input" }))
        .not.toBeInTheDocument();
    });
  });
});
