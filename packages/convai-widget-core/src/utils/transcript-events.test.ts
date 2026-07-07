import { describe, expect, it } from "vitest";
import {
  applyTranscriptEvent,
  createIngestState,
  type TranscriptEntry,
  type TranscriptIngestContext,
  type TranscriptIngestEvent,
  type TranscriptIngestState,
} from "./transcript-events";

const voiceContext: TranscriptIngestContext = {
  isTextConversation: false,
  conversationIndex: 0,
  suppressFirstAgentMessage: false,
};

const textContext: TranscriptIngestContext = {
  ...voiceContext,
  isTextConversation: true,
};

const suppressedTextContext: TranscriptIngestContext = {
  ...textContext,
  suppressFirstAgentMessage: true,
};

/** Run a sequence of events through the reducer and return the final state. */
function run(
  events: TranscriptIngestEvent[],
  context: TranscriptIngestContext = voiceContext,
  state: TranscriptIngestState = createIngestState()
): TranscriptIngestState {
  return events.reduce(
    (current, event) => applyTranscriptEvent(current, event, context).state,
    state
  );
}

function agentMessage(
  message: string,
  eventId?: number
): TranscriptIngestEvent {
  return { type: "message", role: "agent", message, eventId };
}

function part(
  partType: "start" | "delta" | "stop",
  text = "",
  eventId?: number
): TranscriptIngestEvent {
  return { type: "response_part", part: partType, text, eventId };
}

describe("applyTranscriptEvent", () => {
  describe("message isText derivation", () => {
    it.each<{
      description: string;
      context: TranscriptIngestContext;
      event: TranscriptIngestEvent;
      expected: Partial<Extract<TranscriptEntry, { type: "message" }>>;
    }>([
      {
        description: "agent message in a voice conversation is not text",
        context: voiceContext,
        event: agentMessage("Hello", 1),
        expected: {
          role: "agent",
          message: "Hello",
          isText: false,
          eventId: 1,
        },
      },
      {
        description:
          "agent message in a text conversation is text (blocking-guardrail shape)",
        context: textContext,
        event: agentMessage("See the [guide](https://example.com)", 1),
        expected: { role: "agent", isText: true },
      },
      {
        description: "user voice transcript is not text",
        context: voiceContext,
        event: { type: "message", role: "user", message: "Hi", eventId: 2 },
        expected: { role: "user", message: "Hi", isText: false },
      },
      {
        description: "local user message is always text",
        context: voiceContext,
        event: { type: "user_message", message: "typed" },
        expected: { role: "user", message: "typed", isText: true },
      },
    ])("$description", ({ context, event, expected }) => {
      const state = run([event], context);
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0]).toMatchObject(expected);
    });
  });

  describe("first-agent-message suppression", () => {
    it("drops the first agent message and reports it as not accepted", () => {
      const result = applyTranscriptEvent(
        createIngestState(),
        agentMessage("interrupted first message"),
        suppressedTextContext
      );
      expect(result.accepted).toBe(false);
      expect(result.state.entries).toEqual([]);
      expect(result.state.receivedFirstAgentMessage).toBe(true);
    });

    it("accepts the second agent message", () => {
      const state = run(
        [agentMessage("first"), agentMessage("second")],
        suppressedTextContext
      );
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0]).toMatchObject({ message: "second" });
    });

    it("does not suppress user messages", () => {
      const result = applyTranscriptEvent(
        createIngestState(),
        { type: "message", role: "user", message: "hi" },
        suppressedTextContext
      );
      expect(result.accepted).toBe(true);
      expect(result.state.entries).toHaveLength(1);
      expect(result.state.receivedFirstAgentMessage).toBe(false);
    });

    it("ignores response parts before the first agent message without consuming the suppression", () => {
      const state = run(
        [part("start", "", 1), part("delta", "chunk", 1)],
        suppressedTextContext
      );
      expect(state.entries).toEqual([]);
      expect(state.receivedFirstAgentMessage).toBe(false);
      expect(state.isReceivingStream).toBe(false);
    });

    it("does not suppress when the context flag is off", () => {
      const state = run([agentMessage("first")], textContext);
      expect(state.entries).toHaveLength(1);
    });
  });

  describe("streaming response parts", () => {
    it("start appends an empty agent entry and begins the stream", () => {
      const state = run([part("start", "", 5)], textContext);
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0]).toMatchObject({
        role: "agent",
        message: "",
        isText: true,
        eventId: 5,
      });
      expect(state.streamingEntryIndex).toBe(0);
      expect(state.isReceivingStream).toBe(true);
    });

    it("deltas accumulate into the streamed entry", () => {
      const state = run(
        [part("start", "", 5), part("delta", "Hel", 5), part("delta", "lo", 5)],
        textContext
      );
      expect(state.entries[0]).toMatchObject({ message: "Hello" });
    });

    it.each<{ description: string; events: TranscriptIngestEvent[] }>([
      {
        description: "delta without an active stream is a no-op",
        events: [part("delta", "orphan", 5)],
      },
      {
        description: "empty delta text is a no-op",
        events: [part("start", "", 5), part("delta", "", 5)],
      },
    ])("$description", ({ events }) => {
      const state = run(events, textContext);
      const messages = state.entries.filter(e => e.type === "message");
      expect(messages.every(e => e.message === "")).toBe(true);
    });

    it("stop ends delta accumulation but keeps the stream open for the final message", () => {
      const state = run(
        [part("start", "", 5), part("stop", "", 5)],
        textContext
      );
      expect(state.streamingEntryIndex).toBe(null);
      expect(state.isReceivingStream).toBe(true);
    });
  });

  describe("stream finalization by the full message", () => {
    it("replaces the streamed entry with the final message", () => {
      const state = run(
        [
          part("start", "", 5),
          part("delta", "Hel", 5),
          agentMessage("Hello there", 5),
        ],
        textContext
      );
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0]).toMatchObject({
        message: "Hello there",
        isText: true,
        eventId: 5,
      });
      expect(state.isReceivingStream).toBe(false);
    });

    it("replaces the streamed entry when the final message arrives before stop (server order)", () => {
      const state = run(
        [
          part("start", "", 5),
          agentMessage("Hello there", 5),
          part("stop", "", 5),
        ],
        textContext
      );
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0]).toMatchObject({ message: "Hello there" });
      expect(state.streamingEntryIndex).toBe(null);
      expect(state.isReceivingStream).toBe(false);
    });

    it("drops the final message when the stream already stopped, keeping the streamed entry", () => {
      const state = run(
        [
          part("start", "", 5),
          part("delta", "Hello", 5),
          part("stop", "", 5),
          agentMessage("Hello", 5),
        ],
        textContext
      );
      expect(state.entries).toHaveLength(1);
      expect(state.entries[0]).toMatchObject({ message: "Hello" });
      expect(state.isReceivingStream).toBe(false);
    });

    it("appends instead of replacing once the previous stream was finalized", () => {
      const state = run(
        [
          part("start", "", 5),
          agentMessage("first", 5),
          part("stop", "", 5),
          agentMessage("second", 6),
        ],
        textContext
      );
      expect(state.entries).toHaveLength(2);
      expect(state.entries[1]).toMatchObject({ message: "second" });
    });
  });

  describe("tool and local events", () => {
    it("appends tool request and response entries", () => {
      const state = run([
        {
          type: "tool_request",
          toolName: "search",
          toolCallId: "c1",
          eventId: 3,
        },
        { type: "tool_response", toolCallId: "c1", isError: true, eventId: 3 },
      ]);
      expect(state.entries).toEqual([
        {
          type: "agent_tool_request",
          toolName: "search",
          toolCallId: "c1",
          eventId: 3,
          conversationIndex: 0,
        },
        {
          type: "agent_tool_response",
          toolCallId: "c1",
          isError: true,
          eventId: 3,
          conversationIndex: 0,
        },
      ]);
    });

    it("attaches fileInput to user messages only when provided", () => {
      const fileInput = {
        fileName: "doc.pdf",
        mimeType: "application/pdf",
        previewUrl: null,
      };
      const state = run([
        { type: "user_message", message: "with file", fileInput },
        { type: "user_message", message: "without file" },
      ]);
      expect(state.entries[0]).toMatchObject({ fileInput });
      expect(state.entries[1]).not.toHaveProperty("fileInput");
    });

    it("appends mode toggle entries", () => {
      const state = run([{ type: "mode_toggle", mode: "text" }]);
      expect(state.entries[0]).toEqual({
        type: "mode_toggle",
        mode: "text",
        conversationIndex: 0,
      });
    });

    it("stamps entries with the context conversationIndex", () => {
      const state = run([agentMessage("hi")], {
        ...voiceContext,
        conversationIndex: 2,
      });
      expect(state.entries[0]).toMatchObject({ conversationIndex: 2 });
    });
  });

  describe("disconnection and error", () => {
    it.each<{
      description: string;
      event: TranscriptIngestEvent;
      expected: Partial<TranscriptEntry>;
    }>([
      {
        description: "disconnection appends an entry with the ending role",
        event: { type: "disconnection", role: "user" },
        expected: { type: "disconnection", role: "user" },
      },
      {
        description: "error appends an error entry",
        event: { type: "error", message: "boom" },
        expected: { type: "error", message: "boom" },
      },
    ])("$description", ({ event, expected }) => {
      const state = run(
        [
          agentMessage("first"),
          part("start", "", 5),
          part("delta", "in flight", 5),
          event,
        ],
        textContext
      );
      expect(state.entries[state.entries.length - 1]).toMatchObject(expected);
      // Ingest bookkeeping resets so the next session starts clean.
      expect(state.streamingEntryIndex).toBe(null);
      expect(state.isReceivingStream).toBe(false);
      expect(state.receivedFirstAgentMessage).toBe(false);
    });
  });
});
