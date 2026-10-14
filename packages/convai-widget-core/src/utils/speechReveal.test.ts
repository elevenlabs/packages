import { signal, type Signal } from "@preact/signals";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TranscriptEntry } from "../contexts/conversation";
import { buildDisplayTranscript } from "./display-transcript";
import {
  createSpeechReveal,
  PENDING_TIMEOUT_MS,
  SETTLE_MS,
  type SpeechReveal,
} from "./speechReveal";

const EVENT_ID = 10;

type MessageEntry = Extract<TranscriptEntry, { type: "message" }>;

function agentMessage(message: string, eventId = EVENT_ID): MessageEntry {
  return {
    type: "message",
    role: "agent",
    message,
    isText: false,
    conversationIndex: 0,
    eventId,
  };
}

/** Alignment for `text`, one character every 10ms. */
function alignmentFor(text: string) {
  const chars = [...text];
  return {
    chars,
    char_start_times_ms: chars.map((_, index) => index * 10),
    char_durations_ms: chars.map(() => 10),
  };
}

describe("createSpeechReveal", () => {
  let transcript: Signal<TranscriptEntry[]>;
  let reveal: SpeechReveal;

  const shown = () =>
    buildDisplayTranscript(transcript.value, {
      showAgentStatus: false,
      transcriptEnabled: true,
      showRichContent: false,
    }).flatMap(entry => (entry.type === "message" ? [entry.message] : []));

  const addMessage = (message: string, eventId = EVENT_ID) => {
    transcript.value = [...transcript.value, agentMessage(message, eventId)];
    reveal.onAgentMessage(eventId);
  };

  beforeEach(() => {
    vi.useFakeTimers();
    transcript = signal<TranscriptEntry[]>([]);
    reveal = createSpeechReveal(transcript);
  });

  afterEach(() => {
    reveal.reset();
    vi.useRealTimers();
  });

  it("shows messages in full until the session receives alignment", () => {
    addMessage("Hello there.");
    expect(shown()).toEqual(["Hello there."]);
  });

  it("reveals a message as its audio plays", () => {
    reveal.onAlignmentReceived();
    addMessage("Hello there.");
    expect(shown()).toEqual([]);

    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("Hello there."));
    vi.advanceTimersByTime(50);
    expect(shown()).toEqual(["Hello"]);

    vi.advanceTimersByTime(70);
    expect(shown()).toEqual(["Hello there."]);
    expect(transcript.value[0]).toMatchObject({ revealedLength: undefined });
  });

  it("catches up when the message arrives after its audio started", () => {
    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("Hello there."));
    vi.advanceTimersByTime(50);

    addMessage("Hello there.");
    expect(shown()).toEqual(["Hello"]);
  });

  it("keeps only what was said when interrupted", () => {
    reveal.onAlignmentReceived();
    addMessage("Hello there, friend.");
    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("Hello there, friend."));
    vi.advanceTimersByTime(50);

    reveal.onInterruption(EVENT_ID + 1);
    vi.advanceTimersByTime(PENDING_TIMEOUT_MS + SETTLE_MS);
    reveal.finishAll();

    expect(shown()).toEqual(["Hello"]);
    expect(transcript.value[0]).toMatchObject({ speechInterrupted: true });
  });

  it("does not interrupt turns after the interruption", () => {
    reveal.onAlignmentReceived();
    addMessage("Hello there.");
    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("Hello there."));

    reveal.onInterruption(EVENT_ID);
    vi.advanceTimersByTime(200);

    expect(shown()).toEqual(["Hello there."]);
  });

  it("shows the rest once the agent stops speaking, if the reveal fell behind", () => {
    reveal.onAlignmentReceived();
    addMessage("It costs $5.");
    reveal.onModeChange("speaking");
    reveal.onAlignmentPlayback(
      EVENT_ID,
      alignmentFor("It costs five dollars.")
    );
    vi.advanceTimersByTime(300);
    expect(shown()).toEqual(["It costs"]);

    reveal.onModeChange("listening");
    vi.advanceTimersByTime(SETTLE_MS);

    expect(shown()).toEqual(["It costs $5."]);
  });

  it("does not settle while speech resumes after a short stall", () => {
    reveal.onAlignmentReceived();
    addMessage("Hello there.");
    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("Hello "));
    vi.advanceTimersByTime(100);

    reveal.onModeChange("listening");
    vi.advanceTimersByTime(SETTLE_MS / 2);
    reveal.onModeChange("speaking");
    vi.advanceTimersByTime(SETTLE_MS);

    expect(shown()).toEqual(["Hello"]);
  });

  it("shows a message in full if its audio never plays", () => {
    reveal.onAlignmentReceived();
    addMessage("Hello there.");

    vi.advanceTimersByTime(PENDING_TIMEOUT_MS);

    expect(shown()).toEqual(["Hello there."]);
  });

  it("keeps waiting for audio while earlier audio is still playing", () => {
    reveal.onAlignmentReceived();
    reveal.onModeChange("speaking");
    addMessage("Hello there.");

    vi.advanceTimersByTime(PENDING_TIMEOUT_MS * 2);
    expect(shown()).toEqual([]);

    reveal.onModeChange("listening");
    vi.advanceTimersByTime(PENDING_TIMEOUT_MS);
    expect(shown()).toEqual(["Hello there."]);
  });

  it("reveals a second message of the same turn after the first is said", () => {
    reveal.onAlignmentReceived();
    addMessage("Let me check.");
    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("Let me check. "));
    vi.advanceTimersByTime(200);
    expect(shown()).toEqual(["Let me check."]);

    addMessage("It is available.");
    expect(shown()).toEqual(["Let me check."]);

    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("It is "));
    vi.advanceTimersByTime(100);
    expect(shown()).toEqual(["Let me check.", "It is"]);
  });

  it("reveals a second message of the turn whose audio started before it arrived", () => {
    reveal.onAlignmentReceived();
    addMessage("Let me check.");
    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("Let me check. "));
    vi.advanceTimersByTime(200);

    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("It is available."));
    vi.advanceTimersByTime(50);
    addMessage("It is available.");
    expect(shown()).toEqual(["Let me check.", "It is"]);

    vi.advanceTimersByTime(100);
    expect(shown()).toEqual(["Let me check.", "It is available."]);
  });

  it("keeps only what was said of a second message interrupted before it arrived", () => {
    reveal.onAlignmentReceived();
    addMessage("Let me check.");
    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("Let me check. "));
    vi.advanceTimersByTime(200);

    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("It is available."));
    vi.advanceTimersByTime(50);
    reveal.onInterruption(EVENT_ID + 1);
    addMessage("It is available.");
    vi.advanceTimersByTime(PENDING_TIMEOUT_MS + SETTLE_MS);

    expect(shown()).toEqual(["Let me check.", "It is"]);
  });

  it("does not hide a message already shown in full when its audio starts", () => {
    addMessage("Hello there.");
    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("Hello there."));
    vi.advanceTimersByTime(20);

    expect(shown()).toEqual(["Hello there."]);
  });

  it("shows the rest of every turn when finished", () => {
    reveal.onAlignmentReceived();
    addMessage("Hello there.");
    reveal.onAlignmentPlayback(EVENT_ID, alignmentFor("Hello there."));
    vi.advanceTimersByTime(50);

    reveal.finishAll();

    expect(shown()).toEqual(["Hello there."]);
  });
});
