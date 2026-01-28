import { page, userEvent } from "@vitest/browser/context";
import { describe, it, beforeAll, beforeEach, expect, afterAll } from "vitest";
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

  it.each(Variants)(
    "$0 variant should show last message when agent calls end_call",
    async variant => {
      setupWebComponent({
        "agent-id": "end_call_test",
        transcript: "true",
        "text-input": "true",
        variant,
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("Bye");
      await userEvent.keyboard("{Enter}");

      await expect.element(page.getByText("Bye")).toBeInTheDocument();

      await expect
        .element(page.getByText("Goodbye! Have a great day!"))
        .toBeInTheDocument();

      await expect
        .element(page.getByText("The agent ended the conversation"))
        .toBeInTheDocument();
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
    it.each(["document", "widget"])(
      "should expand and collapse widget when elevenlabs-agent:expand event is dispatched (%s)",
      async source => {
        const widget = setupWebComponent({
          "agent-id": "basic",
          "text-input": "true",
          variant: "compact",
        });
        const sourceElement = source === "document" ? document : widget;

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
        sourceElement.dispatchEvent(expandEvent);

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
        sourceElement.dispatchEvent(collapseEvent);

        // The text input should no longer be visible
        await expect
          .element(page.getByRole("textbox", { name: "Text message input" }))
          .not.toBeInTheDocument();
      }
    );

    it.each(["document", "widget"])(
      "should toggle widget when elevenlabs-agent:expand event is dispatched with toggle action (%s)",
      async source => {
        const widget = setupWebComponent({
          "agent-id": "basic",
          transcript: "true",
          "text-input": "true",
          variant: "compact",
        });
        const sourceElement = source === "document" ? document : widget;

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
        sourceElement.dispatchEvent(toggleEvent1);

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
        sourceElement.dispatchEvent(toggleEvent2);

        // Should be collapsed now
        await expect
          .element(page.getByRole("textbox", { name: "Text message input" }))
          .not.toBeInTheDocument();
      }
    );

    it.each(["document", "widget"])(
      "should not expand widget when it's not expandable (no transcript or text input) (%s)",
      async source => {
        const widget = setupWebComponent({
          "agent-id": "basic",
          variant: "compact",
          // No transcript or text-input enabled
        });
        const sourceElement = source === "document" ? document : widget;

        // Dispatch expand event
        const expandEvent = new CustomEvent("elevenlabs-agent:expand", {
          detail: { action: "expand" },
          bubbles: true,
          composed: true,
        });
        sourceElement.dispatchEvent(expandEvent);

        // Widget should remain in its original state (not expanded)
        // The text input should not be present since the widget is not expandable
        await expect
          .element(page.getByRole("textbox", { name: "Text message input" }))
          .not.toBeInTheDocument();
      }
    );
  });

  describe("markdown rendering", () => {
    beforeEach(() => {
      setupWebComponent({
        "agent-id": "markdown",
        variant: "compact",
        "default-expanded": "true",
      });
    });

    it("should render headings", async () => {
      const heading = page.getByRole("heading", { name: "Heading 1" });
      await expect.element(heading).toBeInTheDocument();
    });

    it("should render text formatting (bold, italic)", async () => {
      const boldText = page.getByText("bold");
      await expect.element(boldText).toBeInTheDocument();
      await expect.element(boldText).toHaveClass("font-medium");

      const italicText = page.getByText("italic");
      await expect.element(italicText).toBeInTheDocument();
    });

    it("should render lists", async () => {
      // Verify unordered list items
      await expect.element(page.getByText("List item 1")).toBeInTheDocument();
      await expect.element(page.getByText("List item 2")).toBeInTheDocument();

      // Verify ordered list items
      await expect
        .element(page.getByText("Ordered item 1"))
        .toBeInTheDocument();
      await expect
        .element(page.getByText("Ordered item 2"))
        .toBeInTheDocument();
    });

    it("should render code blocks and inline code", async () => {
      const inlineCode = page.getByText("inline code");
      await expect.element(inlineCode).toBeInTheDocument();

      const codeBlock = page.getByText("const codeBlock = true;");
      await expect.element(codeBlock).toBeInTheDocument();
    });

    it("should render links", async () => {
      const link = page.getByRole("link", { name: "Link text" });
      await expect.element(link).toBeInTheDocument();
      await expect
        .element(link)
        .toHaveAttribute("href", "https://example.com/");
    });

    it("should render images", async () => {
      const image = page.getByRole("img", { name: "Alt text" });
      await expect.element(image).toBeInTheDocument();
    });

    it("should render blockquotes", async () => {
      await expect
        .element(page.getByText("Blockquote text"))
        .toBeInTheDocument();
    });

    it("should render tables", async () => {
      // Verify table headers
      await expect.element(page.getByText("Header 1")).toBeInTheDocument();
      await expect.element(page.getByText("Header 2")).toBeInTheDocument();

      // Verify table cells
      await expect.element(page.getByText("Cell 1")).toBeInTheDocument();
      await expect.element(page.getByText("Cell 2")).toBeInTheDocument();
    });
  });

  describe("markdown link allowlist", () => {
    it("should allow widget domain by default when config omits allowlist", async () => {
      setupWebComponent({
        "agent-id": "markdown_default_domain",
        variant: "compact",
        "default-expanded": "true",
      });

      await expect
        .element(page.getByRole("link", { name: "Relative link" }))
        .toBeInTheDocument();
    });

    it("should deny links when markdown_link_allowed_hosts is empty", async () => {
      setupWebComponent({
        "agent-id": "markdown_no_links",
        variant: "compact",
        "default-expanded": "true",
      });

      await expect
        .element(page.getByText("No links should be clickable:"))
        .toBeInTheDocument();
      await expect.element(page.getByText("Link text")).toBeInTheDocument();
      await expect
        .element(page.getByRole("link", { name: "Link text" }))
        .not.toBeInTheDocument();
    });

    it("should allow only whitelisted domains", async () => {
      setupWebComponent({
        "agent-id": "markdown_domain_allowlist",
        variant: "compact",
        "default-expanded": "true",
      });

      const allowedHttps = page.getByRole("link", {
        name: "Allowed https link",
      });
      await expect.element(allowedHttps).toBeInTheDocument();
      await expect
        .element(allowedHttps)
        .toHaveAttribute("href", "https://example.com/allowed");

      const allowedHttp = page.getByRole("link", { name: "Allowed http link" });
      await expect.element(allowedHttp).toBeInTheDocument();
      await expect
        .element(allowedHttp)
        .toHaveAttribute("href", "http://example.com/http-allowed");

      await expect.element(page.getByText("Blocked link")).toBeInTheDocument();
      await expect
        .element(page.getByRole("link", { name: "Blocked link" }))
        .not.toBeInTheDocument();
    });
  });

  describe("dismissable behavior", () => {
    it("should not show dismiss button by default (opt-in)", async () => {
      setupWebComponent({
        "agent-id": "basic",
        variant: "compact",
      });

      await expect
        .element(page.getByRole("button", { name: "Start a call" }))
        .toBeVisible();
      await expect
        .element(page.getByRole("button", { name: "Dismiss" }))
        .not.toBeInTheDocument();
    });

    it.each(Variants)(
      "$0 variant should allow dismiss and restore via orb",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
          dismissible: "true",
        });

        const startButton = page.getByRole("button", { name: "Start a call" });
        const dismissButton = page.getByRole("button", { name: "Dismiss" });

        // Widget and dismiss button should be visible
        await expect.element(startButton).toBeVisible();
        await expect.element(dismissButton).toBeVisible();

        // Dismiss the widget
        await dismissButton.click();

        // Widget should be hidden, orb should appear
        await expect.element(startButton).not.toBeInTheDocument();
        const orbButton = page.getByRole("button", { name: "Open chat" });
        await expect.element(orbButton).toBeVisible();

        // Click orb to restore widget
        await orbButton.click();

        // Widget should be restored
        await expect.element(startButton).toBeVisible();
        await expect.element(dismissButton).toBeVisible();
      }
    );

    it("should hide dismiss button during active call and show after ending", async () => {
      setupWebComponent({
        "agent-id": "basic",
        variant: "compact",
        dismissible: "true",
        transcript: "true",
      });

      const dismissButton = page.getByRole("button", { name: "Dismiss" });
      await expect.element(dismissButton).toBeVisible();

      // Start a call
      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      await startButton.click();

      // Dismiss button should be hidden during active call
      await expect.element(dismissButton).not.toBeInTheDocument();

      // End the call
      const endButton = page.getByRole("button", { name: "End", exact: true });
      await endButton.click();

      // Dismiss button should reappear
      await expect.element(dismissButton).toBeVisible();
    });

    it("should dismiss expandable widget completely", async () => {
      setupWebComponent({
        "agent-id": "basic",
        variant: "compact",
        dismissible: "true",
        transcript: "true",
        "text-input": "true",
        "default-expanded": "true",
      });

      // Verify expandable elements are visible
      await expect
        .element(page.getByRole("textbox", { name: "Text message input" }))
        .toBeInTheDocument();

      // Dismiss the widget
      const dismissButton = page.getByRole("button", { name: "Dismiss" });
      await dismissButton.click();

      // All widget elements should be hidden
      await expect
        .element(page.getByRole("button", { name: "Start a call" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("textbox", { name: "Text message input" }))
        .not.toBeInTheDocument();

      // Orb should be visible
      await expect
        .element(page.getByRole("button", { name: "Open chat" }))
        .toBeVisible();
    });
  });

  describe("agent status", () => {
    it("should show tool status when show-agent-status is enabled", async () => {
      setupWebComponent({
        "agent-id": "tool_call",
        variant: "compact",
        "show-agent-status": "true",
      });

      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("Run tool");
      await userEvent.keyboard("{Enter}");

      // Tool status should appear
      await expect.element(page.getByText("Thinking...")).toBeInTheDocument();
      await expect.element(page.getByText("Completed")).toBeInTheDocument();
    });

    it("should NOT show tool status when show-agent-status is disabled", async () => {
      setupWebComponent({
        "agent-id": "tool_call",
        variant: "compact",
        "show-agent-status": "false",
      });

      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("Run tool");
      await userEvent.keyboard("{Enter}");

      // Tool status should NOT appear
      await expect
        .element(page.getByText("Thinking..."))
        .not.toBeInTheDocument();
      await expect.element(page.getByText("Completed")).not.toBeInTheDocument();

      // But the agent response should still appear
      await expect
        .element(page.getByText("Tool completed successfully"))
        .toBeInTheDocument();
    });
  });
});
