import { page, userEvent } from "vitest/browser";
import { describe, it, beforeAll, afterAll, afterEach, expect } from "vitest";
import { Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

const STORAGE_KEY = "elevenlabs_convai_persistent_session_persistent_session";

function mountPersistentWidget() {
  return setupWebComponent({
    "agent-id": "persistent_session",
    "persistent-session": "true",
    variant: "compact",
  });
}

async function sendMessage(text: string) {
  const textInput = page.getByRole("textbox", { name: "Text message input" });
  await textInput.fill(text);
  await userEvent.keyboard("{Enter}");
  await expect.element(page.getByText(`You said: ${text}`)).toBeInTheDocument();
}

async function assertRenderedInOrder(texts: string[]) {
  const elements = await Promise.all(
    texts.map(text => page.getByText(text, { exact: true }).element())
  );
  for (let i = 1; i < elements.length; i++) {
    const position = elements[i - 1].compareDocumentPosition(elements[i]);
    expect(
      position & Node.DOCUMENT_POSITION_FOLLOWING,
      `"${texts[i]}" should render after "${texts[i - 1]}"`
    ).toBeTruthy();
  }
}

describe("Persistent sessions", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());
  afterEach(() => localStorage.removeItem(STORAGE_KEY));

  it("replays the stored conversation after a reload", async () => {
    const firstMount = mountPersistentWidget();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    await sendMessage("Where is my parcel?");
    expect(localStorage.getItem(STORAGE_KEY)).toMatch(/^persistent-token-/);

    // Simulate a page reload: the widget is recreated with no in-memory state
    // and only localStorage carried over.
    firstMount.remove();
    mountPersistentWidget();

    await expect
      .element(page.getByText("You said: Where is my parcel?"))
      .toBeInTheDocument();
    await assertRenderedInOrder([
      "Hello from the agent",
      "Where is my parcel?",
      "You said: Where is my parcel?",
    ]);
    // The greeting comes from the replayed transcript only, never a local copy.
    expect(
      page.getByText("Hello from the agent", { exact: true }).all()
    ).toHaveLength(1);

    await sendMessage("Thanks");
    await assertRenderedInOrder([
      "You said: Where is my parcel?",
      "Thanks",
      "You said: Thanks",
    ]);
  });

  it("forgets the conversation when the user ends the chat", async () => {
    mountPersistentWidget();
    await sendMessage("Where is my parcel?");
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    await page.getByRole("button", { name: "End chat" }).click();

    await expect
      .poll(() => localStorage.getItem(STORAGE_KEY), { timeout: 5000 })
      .toBeNull();
  });

  it("starts fresh when the stored token is rejected", async () => {
    localStorage.setItem(STORAGE_KEY, "expired-token");
    mountPersistentWidget();

    await expect
      .poll(() => localStorage.getItem(STORAGE_KEY), { timeout: 5000 })
      .toBeNull();
    await expect
      .element(page.getByText("Hello from the agent", { exact: true }))
      .toBeInTheDocument();
    expect(page.getByText("Could not", { exact: false }).all()).toHaveLength(0);
  });
});
