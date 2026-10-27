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
  | "navigation_resume_rich_content";

function mountWidget(
  agentId: ResumeAgent = "navigation_resume",
  attributes: Omit<CustomAttributes, "agent-id"> = {
    "resume-call-after-navigation": "true",
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

/** The teardown of a page the visitor is navigating away from. */
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

  it("offers the call back on the next page", async () => {
    const firstMount = mountWidget();
    await startCall();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    navigateAway(firstMount);

    mountWidget();

    // The conversation is there, with a way to pick it back up.
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    await expect.element(resumeButton()).toBeInTheDocument();
    // Nothing reconnects on its own.
    expect(page.getByText("Here are the mens casual shoes").all()).toHaveLength(
      0
    );
  });

  it("continues the conversation when the button is pressed", async () => {
    const firstMount = mountWidget();
    await startCall();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    navigateAway(firstMount);

    mountWidget();
    await resumeButton().click();

    await expect
      .element(page.getByText("Here are the mens casual shoes"))
      .toBeInTheDocument();
    // The earlier turns stay on screen and the prompt is spent.
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    expect(resumeButton().all()).toHaveLength(0);

    await vi.waitFor(() =>
      expect(receivedContextualUpdates().join("\n")).toContain(
        "Looking at womens boots"
      )
    );
  });

  it("tells the page the call is being continued", async () => {
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
      await resumeButton().click();
      await expect
        .element(page.getByText("Here are the mens casual shoes"))
        .toBeInTheDocument();
      expect(sawResume).toBe(true);
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

  it("ignores a call interrupted much earlier", async () => {
    const firstMount = mountWidget();
    await startCall();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    navigateAway(firstMount);

    const record = storedRecord();
    expect(record).not.toBeNull();
    sessionStorage.setItem(
      STORAGE_KEY_PREFIX + "navigation_resume",
      JSON.stringify({ ...record, recordedAt: Date.now() - 60_000 })
    );

    mountWidget();

    await expect.element(callButton().first()).toBeInTheDocument();
    expect(resumeButton().all()).toHaveLength(0);
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

    // The turns are still there, behind a fresh offer to pick the call up.
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    getUserMedia.mockRestore();
    await resumeButton().click();

    await expect
      .element(page.getByText("Here are the mens casual shoes"))
      .toBeInTheDocument();
    // The failed attempt's error is not left above the continued call.
    expect(page.getByText("Microphone permission denied").all()).toHaveLength(
      0
    );
    await vi.waitFor(() =>
      expect(receivedContextualUpdates().join("\n")).toContain(
        "Looking at womens boots"
      )
    );
  });

  it("carries the agent's cards over to the next page", async () => {
    const firstMount = mountWidget("navigation_resume_rich_content");
    await startCall();
    await expect.element(page.getByText("Albany")).toBeInTheDocument();
    navigateAway(firstMount);

    mountWidget("navigation_resume_rich_content");

    // The carousel is still on screen alongside the offer, and stays once the
    // conversation is picked back up.
    await expect.element(page.getByText("Albany")).toBeInTheDocument();
    await expect.element(resumeButton()).toBeInTheDocument();

    await resumeButton().click();
    await expect
      .element(page.getByText("Picking up again"))
      .toBeInTheDocument();
    await expect.element(page.getByText("Albany")).toBeInTheDocument();
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
    // The greeting handed over from the previous page, and no second one: the
    // agent opens the continued call listening.
    expect(page.getByText("Welcome to the shop").all()).toHaveLength(1);
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

    // The call button is how a visitor starts over, so it does not pick the
    // interrupted call back up.
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

    // The reply arrives under the first-message event id, since the continued
    // conversation was started without a greeting.
    await expect
      .element(page.getByText("Those come in black too"))
      .toBeInTheDocument();
    // The turns carried over stay on screen and reach the agent, and the
    // offer that was just answered is gone.
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

  it("offers the call back only once", async () => {
    const firstMount = mountWidget();
    await startCall();
    await expect
      .element(page.getByText("Looking at womens boots"))
      .toBeInTheDocument();
    navigateAway(firstMount);
    expect(storedRecord()).not.toBeNull();

    const secondMount = mountWidget();
    await expect.element(resumeButton()).toBeInTheDocument();
    // Reading the record removes it, so a reload of this page starts over.
    expect(storedRecord()).toBeNull();

    secondMount.remove();
    mountWidget();

    await expect.element(callButton().first()).toBeInTheDocument();
    expect(resumeButton().all()).toHaveLength(0);
  });
});
