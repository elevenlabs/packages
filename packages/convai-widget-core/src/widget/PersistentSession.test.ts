import { page, userEvent } from "vitest/browser";
import { describe, it, beforeAll, afterAll, afterEach, expect } from "vitest";
import { PERSISTENT_COLD_ROW_TEXT, Worker } from "../mocks/browser";
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

  it("stores the resume token once the conversation starts", async () => {
    mountPersistentWidget();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    await sendMessage("Where is my parcel?");
    await expect
      .element(page.getByText("You said: Where is my parcel?"))
      .toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    expect(stored).toMatchObject({
      conversationId: expect.any(String),
      token: expect.stringMatching(/^persistent-token-/),
    });
  });

  it("replays history before live messages after a reload", async () => {
    const firstMount = mountPersistentWidget();
    await sendMessage("Where is my parcel?");
    await expect
      .element(page.getByText("You said: Where is my parcel?"))
      .toBeInTheDocument();
    const firstToken = JSON.parse(localStorage.getItem(STORAGE_KEY)!).token;

    // Simulate a page reload: the widget is recreated with no in-memory state
    // and only localStorage carried over.
    firstMount.remove();
    mountPersistentWidget();

    await expect
      .element(page.getByText(PERSISTENT_COLD_ROW_TEXT))
      .toBeInTheDocument();
    await assertRenderedInOrder([
      "Hello from the agent",
      "Where is my parcel?",
      "You said: Where is my parcel?",
      PERSISTENT_COLD_ROW_TEXT,
    ]);
    // The greeting comes from the replayed transcript only, never a local copy.
    expect(
      page.getByText("Hello from the agent", { exact: true }).all()
    ).toHaveLength(1);

    await sendMessage("Thanks");
    await expect
      .element(page.getByText("You said: Thanks"))
      .toBeInTheDocument();
    await assertRenderedInOrder([
      PERSISTENT_COLD_ROW_TEXT,
      "Thanks",
      "You said: Thanks",
    ]);

    // Every segment rotates the token, so the newest one must be the one kept.
    const secondToken = JSON.parse(localStorage.getItem(STORAGE_KEY)!).token;
    expect(secondToken).not.toBe(firstToken);
  });

  it("forgets the conversation when the user ends the chat", async () => {
    mountPersistentWidget();
    await sendMessage("Where is my parcel?");
    await expect
      .element(page.getByText("You said: Where is my parcel?"))
      .toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).not.toBeNull();

    await page.getByRole("button", { name: "End chat" }).click();

    await expect.poll(() => localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it("starts fresh when the stored token is rejected", async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ conversationId: "stale", token: "expired-token" })
    );
    mountPersistentWidget();

    await expect.poll(() => localStorage.getItem(STORAGE_KEY)).toBeNull();
    await expect
      .element(page.getByText("Hello from the agent", { exact: true }))
      .toBeInTheDocument();
    expect(page.getByText("Could not", { exact: false }).all()).toHaveLength(0);
  });
});
