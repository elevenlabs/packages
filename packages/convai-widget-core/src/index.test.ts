import { page, userEvent } from "vitest/browser";
import {
  describe,
  it,
  beforeAll,
  beforeEach,
  afterEach,
  expect,
  afterAll,
  vi,
} from "vitest";
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

  it("should not submit text input while IME composition is active", async () => {
    const widget = setupWebComponent({
      "agent-id": "tool_call",
      variant: "compact",
    });

    const textInput = page.getByRole("textbox", {
      name: "Text message input",
    });
    await textInput.fill("Composing message");

    const textInputElement = widget.shadowRoot?.querySelector("textarea");
    if (!textInputElement) {
      throw new Error("Expected widget textarea to be rendered");
    }

    textInputElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        isComposing: true,
        bubbles: true,
        cancelable: true,
      })
    );

    await expect
      .element(page.getByText("Composing message"))
      .not.toBeInTheDocument();
    await expect.element(textInput).toHaveValue("Composing message");

    textInputElement.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
        cancelable: true,
      })
    );

    await expect
      .element(page.getByText("Composing message"))
      .toBeInTheDocument();
  });

  it("consolidates a streamed partial and its final into a single bubble", async () => {
    // The reducer must consolidate a streamed message into one entry. The mock
    // streams "partial" then delivers "full" as an agent_response for the same
    // event_id, so "full" overwrites the partial in place.
    setupWebComponent({
      "agent-id": "stream_consolidation",
      variant: "compact",
    });

    const textInput = page.getByRole("textbox", {
      name: "Text message input",
    });
    await textInput.fill("go");
    await userEvent.keyboard("{Enter}");

    const finalMessage = page.getByText("full", { exact: true });
    await expect.element(finalMessage).toBeInTheDocument();
    expect(finalMessage.elements()).toHaveLength(1);
    await expect
      .element(page.getByText("partial", { exact: true }))
      .not.toBeInTheDocument();
  });

  it("renders the first streamed reply when the configured first message is interrupted", async () => {
    setupWebComponent({
      "agent-id": "streamed_first_reply",
      variant: "compact",
    });

    await expect.element(page.getByText("Agent response")).toBeInTheDocument();

    const textInput = page.getByRole("textbox", {
      name: "Text message input",
    });
    await textInput.fill("Hello");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByText("First streamed reply"))
      .toBeInTheDocument();
  });

  it("renders a reply that matches the streamed configured first message", async () => {
    setupWebComponent({
      "agent-id": "streamed_first_message",
      variant: "compact",
    });

    const firstMessage = page.getByText("Agent response");
    await expect.element(firstMessage).toBeInTheDocument();

    const textInput = page.getByRole("textbox", {
      name: "Text message input",
    });
    await textInput.fill("Hello");
    await userEvent.keyboard("{Enter}");

    await expect.poll(() => firstMessage.elements().length).toBe(2);
  });

  it("handles a streamed configured first message with a final response", async () => {
    setupWebComponent({
      "agent-id": "streamed_first_message_with_final",
      variant: "compact",
    });

    const firstMessage = page.getByText("Agent response");
    await expect.element(firstMessage).toBeInTheDocument();

    const textInput = page.getByRole("textbox", {
      name: "Text message input",
    });
    await textInput.fill("Hello");
    await userEvent.keyboard("{Enter}");

    await expect
      .element(page.getByText("Production streamed reply"))
      .toBeInTheDocument();
    expect(firstMessage.elements()).toHaveLength(1);
  });

  it.each(Variants)(
    "$0 expandable variant should go through a happy path (text-only)",
    async variant => {
      setupWebComponent({
        "agent-id": "text_only",
        variant,
      });

      const messageButton = page.getByRole("button", { name: "Message" });
      await messageButton.click();

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

  describe("first message for voice-capable agents", () => {
    afterEach(() => {
      localStorage.removeItem("xi:convai-widget-last-used-language");
    });

    it("shows the first message before a text conversation starts", async () => {
      setupWebComponent({ "agent-id": "text_and_voice", variant: "compact" });

      await expect
        .element(page.getByText("Welcome message"))
        .toBeInTheDocument();
    });

    it("shows the first message rich content before a text conversation starts", async () => {
      // The buttons belong to the first message, so a greeting offering choices
      // must not render without them.
      setupWebComponent({
        "agent-id": "text_and_voice_rich_content",
        variant: "compact",
      });

      await expect
        .element(page.getByText("Welcome message"))
        .toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Track my order" }))
        .toBeInTheDocument();
    });

    it("updates first message buttons when the language changes", async () => {
      setupWebComponent({
        "agent-id": "localized",
        variant: "compact",
        "text-input": "true",
        "default-expanded": "true",
      });

      await expect
        .element(page.getByRole("button", { name: "Track my order" }))
        .toBeInTheDocument();

      await page.getByRole("combobox", { name: "Change language" }).click();
      await page.getByRole("option", { name: "Español" }).click();

      await expect
        .element(page.getByRole("button", { name: "Rastrear mi pedido" }))
        .toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Track my order" }))
        .not.toBeInTheDocument();
    });

    it("keeps a single first message when the user starts a text chat", async () => {
      setupWebComponent({ "agent-id": "text_and_voice", variant: "compact" });

      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("Text message");
      await userEvent.keyboard("{Enter}");

      await expect.element(page.getByText("Text message")).toBeInTheDocument();
      await expect
        .element(page.getByText("Another agent response"))
        .toBeInTheDocument();

      // The server sends the first message too, but it arrives after the user's
      // opening message, so the conversation drops it in favour of the locally
      // rendered one rather than showing it twice or out of order.
      const welcome = page.getByText("Welcome message");
      await expect.element(welcome).toBeInTheDocument();
      expect(welcome.elements()).toHaveLength(1);
    });

    it("does not duplicate the first message when the user starts a call", async () => {
      setupWebComponent({ "agent-id": "text_and_voice", variant: "compact" });

      // The locally rendered preview has to give way to the server-sent first
      // message once the conversation starts in voice mode.
      await expect
        .element(page.getByText("Welcome message"))
        .toBeInTheDocument();

      await page.getByRole("button", { name: "Start a call" }).click();

      await expect
        .element(page.getByText("Another agent response"))
        .toBeInTheDocument();

      const welcome = page.getByText("Welcome message");
      await expect.element(welcome).toBeInTheDocument();
      expect(welcome.elements()).toHaveLength(1);
    });
  });

  it.each(Variants)(
    "$0 variant should show last message when agent calls end_call",
    async variant => {
      setupWebComponent({
        "agent-id": "end_call_test",
        transcript: "true",
        "text-input": "true",
        variant,
      });

      const messageButton = page.getByRole("button", { name: "Message" });
      await messageButton.click();

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

  describe("concurrency wait queue", () => {
    it("shows the waiting status and blocks sending while queued", async () => {
      setupWebComponent({
        "agent-id": "queued",
        transcript: "true",
        "text-input": "true",
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();
      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      await expect
        .element(page.getByText("Waiting for an available agent"))
        .toBeInTheDocument();

      // The typing indicator stays hidden while queued.
      await expect
        .element(page.getByText("Agent is typing ..."))
        .not.toBeInTheDocument();

      // Sending is blocked while held in the queue.
      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("Queued message");
      await expect
        .element(page.getByRole("button", { name: "Send", exact: true }))
        .toBeDisabled();
      await userEvent.keyboard("{Enter}");
      await expect
        .element(page.getByText("Queued message"))
        .not.toBeInTheDocument();

      // Hanging up while queued goes through the regular disconnect flow.
      const endButton = page.getByRole("button", { name: "End", exact: true });
      await endButton.click();
      await expect
        .element(page.getByText("You ended the conversation"))
        .toBeInTheDocument();
      await expect
        .element(page.getByText("Waiting for an available agent"))
        .not.toBeInTheDocument();

      // No residual gating: a new conversation can start from the textarea.
      await textInput.fill("New text message");
      await userEvent.keyboard("{Enter}");
      await expect
        .element(page.getByText("New text message"))
        .toBeInTheDocument();
    });

    it("disables rich-content buttons and drops bridged sends while queued", async () => {
      const widget = setupWebComponent({
        "agent-id": "queued",
        transcript: "true",
        "text-input": "true",
        "allow-events": "true",
        "default-expanded": "true",
      });

      // Start via the textarea so the conversation is text-only and rich
      // content renders.
      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("Hello");
      await userEvent.keyboard("{Enter}");
      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      await expect
        .element(page.getByText("Waiting for an available agent"))
        .toBeInTheDocument();

      // Rich-content buttons received while queued render disabled.
      await expect
        .element(page.getByRole("button", { name: "Quick reply" }))
        .toBeDisabled();

      // Programmatic sends via the event bridge are dropped while queued.
      widget.dispatchEvent(
        new CustomEvent("elevenlabs-agent:user-message", {
          detail: { message: "Bridged message" },
        })
      );
      await expect
        .element(page.getByText("Bridged message"))
        .not.toBeInTheDocument();
    });

    it("shows the full waiting message on the avatar overlay", async () => {
      // The expanded sheet without a transcript shows the avatar overlay,
      // which renders the full waiting copy.
      setupWebComponent({ "agent-id": "queued_overlay" });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();
      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      await expect
        .element(page.getByText("All agents are busy right now"))
        .toBeInTheDocument();
    });

    it("keeps the waiting status inside the full trigger", async () => {
      // Regression: the long waiting copy must size the trigger, not get
      // clipped at the card edge.
      setupWebComponent({ "agent-id": "queued", variant: "full" });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();
      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      const label = page.getByText("Waiting for an available agent");
      await expect.element(label).toBeInTheDocument();

      const labelElement = label.element() as HTMLElement;
      // The full copy is visible, not ellipsized...
      expect(labelElement.scrollWidth).toBeLessThanOrEqual(
        labelElement.clientWidth + 1
      );
      // ...and the label stays within the trigger card.
      const card = labelElement.closest(".rounded-sheet")!;
      const labelRect = labelElement.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      expect(labelRect.right).toBeLessThanOrEqual(cardRect.right);
      expect(labelRect.left).toBeGreaterThanOrEqual(cardRect.left);
    });

    it("returns to the regular flow when admitted from the queue", async () => {
      setupWebComponent({
        "agent-id": "queue_admit",
        transcript: "true",
        "text-input": "true",
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();
      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      await expect
        .element(page.getByText("Waiting for an available agent"))
        .toBeInTheDocument();

      // Admitted: the waiting status clears and the agent responds.
      await expect
        .element(page.getByText("Queue cleared response"))
        .toBeInTheDocument();
      await expect
        .element(page.getByText("Waiting for an available agent"))
        .not.toBeInTheDocument();

      // Sending works again.
      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("Hello after queue");
      await userEvent.keyboard("{Enter}");
      await expect
        .element(page.getByText("Hello after queue"))
        .toBeInTheDocument();
    });

    it("shows a friendly message when the queue wait times out", async () => {
      setupWebComponent({
        "agent-id": "queue_timeout",
        transcript: "true",
        "text-input": "true",
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();
      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      await expect
        .element(page.getByText("Waiting for an available agent"))
        .toBeInTheDocument();

      // Friendly copy instead of the raw close reason or error styling.
      await expect
        .element(
          page.getByText("All agents are still busy. Please try again later.")
        )
        .toBeInTheDocument();
      await expect
        .element(page.getByText("An error occurred"))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByText("too many concurrent connections"))
        .not.toBeInTheDocument();
      await expect.element(startButton).toBeInTheDocument();
    });
  });

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
    it("should render links from bare text-only agent responses", async () => {
      setupWebComponent({
        "agent-id": "markdown_agent_response",
        variant: "compact",
      });

      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("Text message");
      await userEvent.keyboard("{Enter}");

      const link = page.getByRole("link", { name: "setup guide" });
      await expect.element(link).toBeInTheDocument();
      await expect
        .element(link)
        .toHaveAttribute("href", "https://example.com/setup");
    });

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

  describe("strip audio tags", () => {
    it("should not strip audio tags from text messages even when strip_audio_tags config is true", async () => {
      setupWebComponent({
        "agent-id": "audio_tags_strip",
        variant: "compact",
      });

      // Text messages (isText: true) should preserve tags — stripping only applies to voice transcripts
      await expect.element(page.getByText(/\[happy\]/)).toBeInTheDocument();
    });

    it("should strip audio tags from the locally rendered first message of a voice-capable agent", async () => {
      // first_message is written for TTS, so the local copy has to strip tags
      // even though it renders as a text bubble.
      setupWebComponent({
        "agent-id": "text_and_voice_audio_tags",
        variant: "compact",
      });

      await expect
        .element(page.getByText("Hello there! How can I help you today?"))
        .toBeInTheDocument();
      await expect.element(page.getByText(/\[happy\]/)).not.toBeInTheDocument();
    });

    it("should not strip audio tags when strip_audio_tags config is false", async () => {
      setupWebComponent({
        "agent-id": "audio_tags_no_strip",
        variant: "compact",
      });

      // Tags should be visible when stripping is disabled
      await expect.element(page.getByText(/\[happy\]/)).toBeInTheDocument();
    });

    it("should strip audio tags from voice transcripts when strip_audio_tags is true", async () => {
      setupWebComponent({
        "agent-id": "audio_tags_voice_strip",
        transcript: "true",
        variant: "compact",
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      await expect
        .element(page.getByText("Hello there! How can I help you today?"))
        .toBeInTheDocument();
      await expect.element(page.getByText(/\[happy\]/)).not.toBeInTheDocument();
    });

    it("should style audio tags in voice transcripts when strip_audio_tags is false", async () => {
      setupWebComponent({
        "agent-id": "audio_tags_voice_style",
        transcript: "true",
        variant: "compact",
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      const happyTag = page.getByText("[happy]");
      await expect.element(happyTag).toBeInTheDocument();
      await expect
        .element(happyTag.element().closest("[data-audio-tag]") as HTMLElement)
        .toBeInTheDocument();
    });

    it("should render markdown in voice transcripts", async () => {
      setupWebComponent({
        "agent-id": "voice_markdown",
        transcript: "true",
        variant: "compact",
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      const boldText = page.getByText("bold");
      await expect.element(boldText).toBeInTheDocument();
      await expect.element(boldText).toHaveClass("font-medium");

      const link = page.getByRole("link", { name: "link" });
      await expect.element(link).toBeInTheDocument();
      await expect
        .element(link)
        .toHaveAttribute("href", "https://example.com/");

      const happyTag = page.getByText("[happy]");
      await expect.element(happyTag).toBeInTheDocument();
      await expect
        .element(happyTag.element().closest("[data-audio-tag]") as HTMLElement)
        .toBeInTheDocument();

      // Audio tags inside code must stay literal, not become styled pills
      const codeTag = page.getByText("[sad]");
      await expect.element(codeTag).toBeInTheDocument();
      expect(codeTag.element().closest("[data-audio-tag]")).toBeNull();
    });

    it("should not style the blocked-link indicator as an audio tag", async () => {
      setupWebComponent({
        "agent-id": "voice_markdown_blocked_link",
        transcript: "true",
        variant: "compact",
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      // Real audio tags are still styled
      const happyTag = page.getByText("[happy]");
      await expect.element(happyTag).toBeInTheDocument();
      await expect
        .element(happyTag.element().closest("[data-audio-tag]") as HTMLElement)
        .toBeInTheDocument();

      // rehype-harden appends " [blocked]" to disallowed links; it must stay a
      // plain indicator rather than becoming a tag pill
      const blocked = page.getByText("[blocked]");
      await expect.element(blocked).toBeInTheDocument();
      expect(blocked.element().closest("[data-audio-tag]")).toBeNull();
      await expect
        .element(page.getByRole("link", { name: "Evil link" }))
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

  describe("language auto-select", () => {
    afterEach(() => {
      localStorage.removeItem("xi:convai-widget-last-used-language");
      vi.restoreAllMocks();
    });

    it("should auto-select browser language on first visit", async () => {
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "en"]);

      setupWebComponent({
        "agent-id": "localized",
        variant: "compact",
        "text-input": "true",
        "default-expanded": "true",
      });

      // Sheet header language trigger shows the language name
      const langButton = page.getByRole("combobox", {
        name: "Change language",
      });
      await expect.element(langButton).toHaveTextContent("Français");
    });

    it("should auto-select last-used language over browser language", async () => {
      vi.spyOn(navigator, "languages", "get").mockReturnValue(["fr-FR", "en"]);
      localStorage.setItem("xi:convai-widget-last-used-language", "es");

      setupWebComponent({
        "agent-id": "localized",
        variant: "compact",
        "text-input": "true",
        "default-expanded": "true",
      });

      const langButton = page.getByRole("combobox", {
        name: "Change language",
      });
      await expect.element(langButton).toHaveTextContent("Español");
      await expect
        .element(page.getByRole("button", { name: "Rastrear mi pedido" }))
        .toBeInTheDocument();
    });
  });

  describe("show-conversation-id", () => {
    it.each(Variants)(
      "%s variant should NOT show conversation ID after disconnect when show-conversation-id is false",
      async variant => {
        setupWebComponent({
          "agent-id": "text_only",
          variant,
          "show-conversation-id": "false",
        });

        const messageButton = page.getByRole("button", {
          name: "Message",
        });
        await messageButton.click();

        await expect.element(page.getByText("Test terms")).toBeInTheDocument();
        const acceptButton = page.getByRole("button", { name: "Accept" });
        await acceptButton.click();

        await expect
          .element(page.getByText("Agent response"))
          .toBeInTheDocument();

        const textInput = page.getByRole("textbox", {
          name: "Text message input",
        });
        await textInput.fill("Text message");
        await userEvent.keyboard("{Enter}");

        await expect
          .element(page.getByText("The agent ended the conversation"))
          .toBeInTheDocument();
        await expect.element(page.getByText("ID")).not.toBeInTheDocument();
      }
    );

    it("should still show conversation ID in error messages when show-conversation-id is false", async () => {
      setupWebComponent({
        "agent-id": "fail",
        variant: "compact",
        transcript: "true",
        "text-input": "true",
        "show-conversation-id": "false",
      });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await textInput.fill("trigger error");
      await userEvent.keyboard("{Enter}");

      await expect
        .element(page.getByText("An error occurred"))
        .toBeInTheDocument();
      await expect.element(page.getByText("ID")).toBeInTheDocument();
    });
  });

  describe("agent status", () => {
    it("should render inline tool status when show-agent-status is enabled", async () => {
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

      // Tool status is rendered inline with the associated agent message.
      await expect
        .element(page.getByText("Tool completed successfully"))
        .toBeInTheDocument();
      await expect
        .element(page.getByText("Completed", { exact: true }))
        .toBeInTheDocument();
      await expect
        .element(page.getByText("Working..."))
        .not.toBeInTheDocument();
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
        .element(page.getByText("Working..."))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByText("Completed", { exact: true }))
        .not.toBeInTheDocument();

      // But the agent response should still appear
      await expect
        .element(page.getByText("Tool completed successfully"))
        .toBeInTheDocument();
    });

    it("should keep completed status visible after disconnect", async () => {
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

      await expect
        .element(page.getByText("Completed", { exact: true }))
        .toBeInTheDocument();

      const endButton = page.getByRole("button", { name: "End", exact: true });
      await endButton.click();

      // Completed status remains visible for historical messages.
      await expect
        .element(page.getByText("Completed", { exact: true }))
        .toBeInTheDocument();
    });
  });

  describe("user-id", () => {
    beforeEach(() => {
      // Clear localStorage before each test to ensure clean slate
      localStorage.clear();
    });

    beforeAll(() => {
      // Mock FingerprintJS for tests
      vi.mock("@fingerprintjs/fingerprintjs", () => ({
        default: {
          load: vi.fn().mockResolvedValue({
            get: vi.fn().mockResolvedValue({
              visitorId: "test-fingerprint-id-123",
            }),
          }),
        },
      }));
    });

    it.each(Variants)(
      "$0 variant should create new user-id in local storage after accepting terms",
      async variant => {
        // Verify localStorage is empty at the beginning
        const STORAGE_KEY = "elevenlabs_convai_user_id";
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

        setupWebComponent({ "agent-id": "basic", variant });

        const startButton = page.getByRole("button", { name: "Start a call" });
        await startButton.click();

        await expect.element(page.getByText("Test terms")).toBeInTheDocument();
        const acceptButton = page.getByRole("button", { name: "Accept" });
        await acceptButton.click();

        // Verify user-id has been set in localStorage
        const userId = localStorage.getItem(STORAGE_KEY);
        expect(userId).not.toBeNull();
        expect(userId).toBeTruthy();
      }
    );

    it.each(Variants)(
      "$0 variant should NOT set localStorage when user-id attribute is provided",
      async variant => {
        const STORAGE_KEY = "elevenlabs_convai_user_id";
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

        setupWebComponent({
          "agent-id": "basic",
          variant,
          "user-id": "explicit-user-123",
        });

        const startButton = page.getByRole("button", { name: "Start a call" });
        await startButton.click();

        await expect.element(page.getByText("Test terms")).toBeInTheDocument();
        const acceptButton = page.getByRole("button", { name: "Accept" });
        await acceptButton.click();

        // Verify localStorage was NOT modified
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      }
    );

    it.each(Variants)(
      "$0 variant should reuse existing user-id from localStorage",
      async variant => {
        const STORAGE_KEY = "elevenlabs_convai_user_id";
        const existingUserId = "pre-existing-uuid-456";
        localStorage.setItem(STORAGE_KEY, existingUserId);

        setupWebComponent({ "agent-id": "basic", variant });

        const startButton = page.getByRole("button", { name: "Start a call" });
        await startButton.click();

        await expect.element(page.getByText("Test terms")).toBeInTheDocument();
        const acceptButton = page.getByRole("button", { name: "Accept" });
        await acceptButton.click();

        // Verify the same user-id is still in localStorage (not replaced)
        const userId = localStorage.getItem(STORAGE_KEY);
        expect(userId).toBe(existingUserId);
      }
    );

    it("should fallback to random UUID when FingerprintJS fails and conversation is still created", async () => {
      const STORAGE_KEY = "elevenlabs_convai_user_id";

      // Set up FingerprintJS to fail
      const originalFingerprint = await import("@fingerprintjs/fingerprintjs");
      const FingerprintJS = originalFingerprint.default;
      const originalLoad = FingerprintJS.load;

      // Override to throw error
      FingerprintJS.load = async () => {
        throw new Error("FingerprintJS intentionally failed for test");
      };

      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

      setupWebComponent({ "agent-id": "basic", variant: "compact" });

      const startButton = page.getByRole("button", { name: "Start a call" });
      await startButton.click();

      await expect.element(page.getByText("Test terms")).toBeInTheDocument();
      const acceptButton = page.getByRole("button", { name: "Accept" });
      await acceptButton.click();

      const userId = localStorage.getItem(STORAGE_KEY);
      expect(userId).not.toBeNull();
      expect(userId).toBeTruthy();

      const endButton = page.getByRole("button", { name: "End", exact: true });
      await expect.element(endButton).toBeInTheDocument();

      // Restore original function
      FingerprintJS.load = originalLoad;
    });
  });

  describe("terms kill switch", () => {
    it("should not show terms modal when top-level terms are null even if language presets are set", async () => {
      setupWebComponent({
        "agent-id": "terms_disabled_with_stale_presets",
        variant: "compact",
      });

      // The mocked agent has `default_expanded: true`, so the widget opens
      // the chat directly without a "Start a call" button. If the kill
      // switch works, no terms modal blocks the conversation and the
      // agent's first message renders.
      await expect
        .element(page.getByText("Stale preset terms"))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Accept" }))
        .not.toBeInTheDocument();

      await expect
        .element(page.getByText("Agent response"))
        .toBeInTheDocument();
    });
  });
});
