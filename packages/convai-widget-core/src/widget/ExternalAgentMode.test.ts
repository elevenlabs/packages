import { page, userEvent } from "vitest/browser";
import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

describe("External agent mode", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  it("clears the typing indicator when the external agent disconnects", async () => {
    setupWebComponent({
      "agent-id": "external_agent",
      variant: "compact",
    });

    const textInput = page.getByRole("textbox", {
      name: "Text message input",
    });
    const typingIndicator = page.getByText("Agent is typing ...");

    await textInput.fill("escalate");
    await userEvent.keyboard("{Enter}");
    await expect.element(typingIndicator).toBeInTheDocument();

    // The mock replies with `external_agent_disconnected` and nothing else, so
    // the handler under test is the only thing that can clear the indicator.
    await textInput.fill("still there?");
    await userEvent.keyboard("{Enter}");
    await expect.element(typingIndicator).not.toBeInTheDocument();
  });
});
