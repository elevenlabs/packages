import { page, userEvent } from "vitest/browser";
import { describe, it, beforeAll, afterAll, afterEach, expect } from "vitest";
import { Worker, persistentConversationIdFor } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";

const STORAGE_KEY = "elevenlabs_convai_persistent_session_persistent_session";
const DISABLED_STORAGE_KEY =
  "elevenlabs_convai_persistent_session_persistent_session_disabled";

function mountPersistentWidget(
  agentId:
    | "persistent_session"
    | "persistent_session_disabled" = "persistent_session"
) {
  return setupWebComponent({
    "agent-id": agentId,
    "persistent-session": "true",
    variant: "compact",
  });
}

async function typeMessage(text: string) {
  const textInput = page.getByRole("textbox", { name: "Text message input" });
  await textInput.fill(text);
  await userEvent.keyboard("{Enter}");
}

async function sendMessage(text: string) {
  await typeMessage(text);
  await expect.element(page.getByText(`You said: ${text}`)).toBeInTheDocument();
}

function storedConversationId() {
  return persistentConversationIdFor(localStorage.getItem(STORAGE_KEY));
}

function setVisibilityState(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function assertConversationNotEnded() {
  expect(page.getByText("ended the conversation").all()).toHaveLength(0);
  expect(page.getByText("An error occurred").all()).toHaveLength(0);
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
  afterEach(() => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(DISABLED_STORAGE_KEY);
    Reflect.deleteProperty(document, "visibilityState");
  });

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

  it("reopens the chat after a reload when a conversation is in progress", async () => {
    const collapsedWidget = {
      "agent-id": "persistent_session",
      "persistent-session": "true",
      variant: "compact",
      "default-expanded": "false",
    } as const;
    const firstMount = setupWebComponent(collapsedWidget);
    await page.getByRole("button", { name: "Message" }).click();
    await sendMessage("Where is my parcel?");

    firstMount.remove();
    setupWebComponent(collapsedWidget);

    await expect
      .element(page.getByText("You said: Where is my parcel?"))
      .toBeInTheDocument();
  });

  it("stays collapsed when there is no conversation to resume", async () => {
    setupWebComponent({
      "agent-id": "persistent_session",
      "persistent-session": "true",
      variant: "compact",
      "default-expanded": "false",
    });

    await expect
      .element(page.getByRole("button", { name: "Message" }))
      .toBeInTheDocument();
    expect(
      page.getByRole("textbox", { name: "Text message input" }).all()
    ).toHaveLength(0);
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

  it("keeps the transcript and continues the conversation after a dropped socket", async () => {
    mountPersistentWidget();
    await sendMessage("Where is my parcel?");
    const conversationId = storedConversationId();

    await typeMessage("drop the connection");
    await expect
      .element(page.getByRole("button", { name: "End chat" }), {
        timeout: 5000,
      })
      .not.toBeInTheDocument();
    assertConversationNotEnded();

    await sendMessage("Thanks");
    expect(storedConversationId()).toBe(conversationId);
    assertConversationNotEnded();
    await assertRenderedInOrder([
      "Hello from the agent",
      "Where is my parcel?",
      "You said: Where is my parcel?",
      "drop the connection",
      "Thanks",
      "You said: Thanks",
    ]);
    expect(
      page.getByText("Where is my parcel?", { exact: true }).all()
    ).toHaveLength(1);
  });

  it("closes cleanly in the background and resumes in the foreground", async () => {
    mountPersistentWidget();
    await sendMessage("Where is my parcel?");
    const conversationId = storedConversationId();
    const tokenBeforeHide = localStorage.getItem(STORAGE_KEY);

    setVisibilityState("hidden");
    await expect
      .element(page.getByRole("button", { name: "End chat" }), {
        timeout: 5000,
      })
      .not.toBeInTheDocument();
    assertConversationNotEnded();

    setVisibilityState("visible");
    // Every connect rotates the token, so a new one proves the resume landed.
    await expect
      .poll(() => localStorage.getItem(STORAGE_KEY), { timeout: 5000 })
      .not.toBe(tokenBeforeHide);
    expect(storedConversationId()).toBe(conversationId);

    await sendMessage("Thanks");
    assertConversationNotEnded();
    expect(
      page.getByText("Hello from the agent", { exact: true }).all()
    ).toHaveLength(1);
    expect(
      page.getByText("Where is my parcel?", { exact: true }).all()
    ).toHaveLength(1);
  });

  it("retries without persistence when the workspace refuses it", async () => {
    mountPersistentWidget("persistent_session_disabled");
    await sendMessage("Where is my parcel?");

    expect(localStorage.getItem(DISABLED_STORAGE_KEY)).toBeNull();
    expect(page.getByText("Could not", { exact: false }).all()).toHaveLength(0);
    expect(
      page.getByText("Where is my parcel?", { exact: true }).all()
    ).toHaveLength(1);
    assertConversationNotEnded();
  });
});
