import { page } from "vitest/browser";
import {
  describe,
  it,
  beforeAll,
  afterAll,
  afterEach,
  expect,
  vi,
} from "vitest";
import {
  receivedContextualUpdates,
  resetNavigationResumeMock,
  Worker,
} from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";
import type { CustomAttributes } from "../types/attributes";
import type { NavigationResumeRecord } from "../utils/navigationResume";

const STORAGE_KEY_PREFIX = "elevenlabs_convai_navigation_resume_";

type ResumeAgent =
  | "navigation_resume"
  | "navigation_resume_text"
  | "navigation_resume_greeting"
  | "navigation_resume_no_override"
  | "navigation_resume_rich_content";

function mountWidget(
  agentId: ResumeAgent = "navigation_resume",
  attributes: Omit<CustomAttributes, "agent-id"> = {
    "persistent-session": "true",
  }
) {
  return setupWebComponent({
    "agent-id": agentId,
    variant: "compact",
    ...attributes,
  });
}

function storedRecord(
  agentId: ResumeAgent = "navigation_resume"
): NavigationResumeRecord | null {
  const raw = sessionStorage.getItem(STORAGE_KEY_PREFIX + agentId);
  return raw ? (JSON.parse(raw) as NavigationResumeRecord) : null;
}

const resumeButton = () =>
  page.getByRole("button", { name: "Resume talking?" });
const callButton = () => page.getByRole("button", { name: "Start a call" });

async function startCall() {
  await callButton().first().click();
}

function navigateAway(mount: HTMLElement) {
  window.dispatchEvent(new Event("pagehide"));
  mount.remove();
}

describe("Resuming a call after a navigation", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());
  afterEach(() => {
    for (const key of Object.keys(sessionStorage)) {
      if (key.startsWith(STORAGE_KEY_PREFIX)) sessionStorage.removeItem(key);
    }
    resetNavigationResumeMock();
    vi.restoreAllMocks();
  });

  it("offers the call back on the next page and continues it", async () => {
    let sawResume: boolean | undefined;
    const onCall = (event: Event) => {
      sawResume = (event as CustomEvent).detail.navigationResume;
    };
    document.addEventListener("elevenlabs-convai:call", onCall);

    try {
      const firstMount = mountWidget();
      await startCall();
      await expect
        .element(page.getByText("Looking at womens boots"))
        .toBeInTheDocument();
      expect(sawResume).toBe(false);
      navigateAway(firstMount);

      mountWidget();
      await expect.element(resumeButton()).toBeInTheDocument();
      expect(
        page.getByText("Here are the mens casual shoes").all()
      ).toHaveLength(0);

      await resumeButton().click();
      await expect
        .element(page.getByText("Here are the mens casual shoes"))
        .toBeInTheDocument();
      await expect
        .element(page.getByText("Looking at womens boots"))
        .toBeInTheDocument();
      expect(resumeButton().all()).toHaveLength(0);
      expect(sawResume).toBe(true);
      await vi.waitFor(() =>
        expect(receivedContextualUpdates().join("\n")).toContain(
          "Looking at womens boots"
        )
      );
    } finally {
      document.removeEventListener("elevenlabs-convai:call", onCall);
    }
  });

  it("does nothing when the option is off", async () => {
    const mount = mountWidget("navigation_resume", {});
    await startCall();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();

    navigateAway(mount);

    expect(storedRecord()).toBeNull();
    mountWidget("navigation_resume", {});
    await expect.element(callButton().first()).toBeInTheDocument();
    expect(resumeButton().all()).toHaveLength(0);
  });

  it("leaves a text chat alone", async () => {
    const mount = mountWidget("navigation_resume_text");
    const textInput = page.getByRole("textbox", { name: "Text message input" });
    await textInput.fill("Show me boots");
    await page.getByRole("button", { name: "Send" }).click();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();

    navigateAway(mount);

    expect(storedRecord("navigation_resume_text")).toBeNull();
  });

  it("offers the call back again when the call fails to start", async () => {
    const firstMount = mountWidget();
    await startCall();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    navigateAway(firstMount);

    mountWidget();
    const getUserMedia = vi
      .spyOn(navigator.mediaDevices, "getUserMedia")
      .mockRejectedValue(new Error("Microphone permission denied"));
    await resumeButton().click();
    await expect
      .element(page.getByText("Microphone permission denied"))
      .toBeInTheDocument();

    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    getUserMedia.mockRestore();
    await resumeButton().click();

    await expect
      .element(page.getByText("Here are the mens casual shoes"))
      .toBeInTheDocument();
    expect(page.getByText("Microphone permission denied").all()).toHaveLength(
      0
    );
    await vi.waitFor(() =>
      expect(receivedContextualUpdates().join("\n")).toContain(
        "Looking at womens boots"
      )
    );
  });

  it("carries the agent's cards over and continues from a quick reply", async () => {
    const firstMount = mountWidget("navigation_resume_rich_content");
    await startCall();
    await expect.element(page.getByText("Albany")).toBeInTheDocument();
    navigateAway(firstMount);

    mountWidget("navigation_resume_rich_content");
    await expect.element(page.getByText("Albany")).toBeInTheDocument();
    await page.getByRole("button", { name: "Tell me more" }).click();

    await expect.poll(() => resumeButton().all()).toHaveLength(0);
    await expect
      .element(page.getByRole("button", { name: "End", exact: true }))
      .toBeInTheDocument();
    await expect.element(page.getByText("Albany")).toBeInTheDocument();
    await vi.waitFor(() =>
      expect(receivedContextualUpdates().join("\n")).toContain(
        "Here are my picks"
      )
    );
  });

  it("does not greet again on the continued call", async () => {
    const firstMount = mountWidget("navigation_resume_greeting");
    await startCall();
    await expect
      .element(page.getByText("Welcome to the shop"))
      .toBeInTheDocument();
    navigateAway(firstMount);

    mountWidget("navigation_resume_greeting");
    await resumeButton().click();

    await vi.waitFor(() =>
      expect(receivedContextualUpdates().join("\n")).toContain(
        "Welcome to the shop"
      )
    );
    expect(page.getByText("Welcome to the shop").all()).toHaveLength(1);
  });

  it("lets the agent greet when it refuses the greeting override", async () => {
    const firstMount = mountWidget("navigation_resume_no_override");
    await startCall();
    await expect
      .element(page.getByText("Welcome to the shop"))
      .toBeInTheDocument();
    navigateAway(firstMount);

    mountWidget("navigation_resume_no_override");
    await resumeButton().click();

    await expect
      .poll(() => page.getByText("Welcome to the shop").all())
      .toHaveLength(2);
    expect(page.getByText("not allowed by config").all()).toHaveLength(0);
    await vi.waitFor(() =>
      expect(receivedContextualUpdates().join("\n")).toContain(
        "Welcome to the shop"
      )
    );
  });

  it("keeps the offer through quick navigations, not a long stay", async () => {
    const firstMount = mountWidget();
    await startCall();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    navigateAway(firstMount);

    const secondMount = mountWidget();
    await expect.element(resumeButton()).toBeInTheDocument();
    navigateAway(secondMount);

    const thirdMount = mountWidget();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    await expect.element(resumeButton()).toBeInTheDocument();
    vi.spyOn(Date, "now").mockReturnValue(Date.now() + 10 * 60_000);
    navigateAway(thirdMount);

    mountWidget();
    await expect.element(callButton().first()).toBeInTheDocument();
    expect(resumeButton().all()).toHaveLength(0);
  });

  it("shows the end screen when the offer is turned down", async () => {
    const firstMount = mountWidget();
    await startCall();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    navigateAway(firstMount);
    expect(storedRecord()?.conversationId).toBeTruthy();

    const secondMount = mountWidget();
    await page.getByRole("button", { name: "End", exact: true }).click();

    await expect
      .element(page.getByText("You ended the conversation"))
      .toBeInTheDocument();
    expect(resumeButton().all()).toHaveLength(0);
    navigateAway(secondMount);
    expect(storedRecord()).toBeNull();
  });

  it("starts a new conversation from the call button", async () => {
    const firstMount = mountWidget();
    await startCall();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    navigateAway(firstMount);

    mountWidget();
    await expect.element(resumeButton()).toBeInTheDocument();

    await startCall();
    await expect
      .element(page.getByText("Here are the mens casual shoes"))
      .toBeInTheDocument();

    expect(resumeButton().all()).toHaveLength(0);
    expect(page.getByText("Looking at womens boots").all()).toHaveLength(0);
    expect(receivedContextualUpdates()).toHaveLength(0);
  });

  it("continues the conversation when the offer is answered by typing", async () => {
    const firstMount = mountWidget("navigation_resume_greeting");
    await startCall();
    await expect
      .element(page.getByText("Welcome to the shop"))
      .toBeInTheDocument();
    navigateAway(firstMount);

    mountWidget("navigation_resume_greeting");
    await expect.element(resumeButton()).toBeInTheDocument();

    const textInput = page.getByRole("textbox", { name: "Text message input" });
    await textInput.fill("Show me those in black");
    await page.getByRole("button", { name: "Send" }).click();

    await expect
      .element(page.getByText("Those come in black too"))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Show me those in black"))
      .toBeInTheDocument();
    await expect
      .element(page.getByText("Welcome to the shop"))
      .toBeInTheDocument();
    expect(resumeButton().all()).toHaveLength(0);
    await vi.waitFor(() =>
      expect(receivedContextualUpdates().join("\n")).toContain(
        "Welcome to the shop"
      )
    );
  });
});
