import { describe, expect, it } from "vitest";
import type { TranscriptEntry } from "../contexts/conversation";
import {
  buildDisplayTranscript,
  type DisplayTranscriptConfig,
  type DisplayTranscriptEntry,
} from "./display-transcript";

/** Helper to create a message entry */
function msg(
  role: "agent" | "user",
  message: string,
  opts: { eventId?: number; isText?: boolean; conversationIndex?: number } = {}
): Extract<TranscriptEntry, { type: "message" }> {
  return {
    type: "message",
    role,
    message,
    isText: opts.isText ?? true,
    conversationIndex: opts.conversationIndex ?? 0,
    eventId: opts.eventId,
  };
}

/** Helper to create a tool request entry */
function toolReq(
  eventId: number,
  toolCallId = "call_1"
): Extract<TranscriptEntry, { type: "agent_tool_request" }> {
  return {
    type: "agent_tool_request",
    toolName: "test_tool",
    toolCallId,
    eventId,
    conversationIndex: 0,
  };
}

/** Helper to create a tool response entry */
function toolRes(
  eventId: number,
  opts: { toolCallId?: string; isError?: boolean } = {}
): Extract<TranscriptEntry, { type: "agent_tool_response" }> {
  return {
    type: "agent_tool_response",
    toolCallId: opts.toolCallId ?? "call_1",
    eventId,
    isError: opts.isError ?? false,
    conversationIndex: 0,
  };
}

function richContent(
  id = "buttons_1",
  opts: { eventId?: number } = {}
): Extract<TranscriptEntry, { type: "rich_content" }> {
  return {
    type: "rich_content",
    component: "buttons",
    props: { buttons: [{ label: id, message: id }] },
    conversationIndex: 0,
    eventId: opts.eventId ?? 2,
    richContentId: `rc_${id}`,
  };
}

/** Default config — no status, transcript enabled */
const defaults: DisplayTranscriptConfig = {
  showAgentStatus: false,
  transcriptEnabled: true,
  showRichContent: true,
};

function build(
  entries: TranscriptEntry[],
  config: Partial<DisplayTranscriptConfig> = {}
): DisplayTranscriptEntry[] {
  return buildDisplayTranscript(entries, { ...defaults, ...config });
}

describe("buildDisplayTranscript", () => {
  describe("basic message passthrough", () => {
    it.each<{
      description: string;
      input: TranscriptEntry[];
      expected: Array<{ type: string; message?: string; role?: string }>;
    }>([
      {
        description: "empty input",
        input: [],
        expected: [],
      },
      {
        description: "simple user + agent messages",
        input: [msg("user", "hi"), msg("agent", "hello", { eventId: 1 })],
        expected: [
          { type: "message", role: "user", message: "hi" },
          { type: "message", role: "agent", message: "hello" },
        ],
      },
      {
        description: "disconnection, error, mode_toggle pass through",
        input: [
          { type: "disconnection", role: "user", conversationIndex: 0 },
          { type: "error", message: "oops", conversationIndex: 0 },
          { type: "mode_toggle", mode: "text", conversationIndex: 0 },
        ],
        expected: [
          { type: "disconnection" },
          { type: "error", message: "oops" },
          { type: "mode_toggle" },
        ],
      },
    ])("$description", ({ input, expected }) => {
      const result = build(input);
      expect(result).toHaveLength(expected.length);
      expected.forEach((exp, i) => {
        expect(result[i]).toMatchObject(exp);
      });
    });
  });

  describe("empty message filtering", () => {
    it.each<{
      description: string;
      input: TranscriptEntry[];
      expected: Array<{ message: string }>;
    }>([
      {
        description: "skips empty agent messages",
        input: [
          msg("agent", "", { eventId: 2 }),
          msg("agent", "Done", { eventId: 2 }),
        ],
        expected: [{ message: "Done" }],
      },
      {
        description: "skips multiple empty agent messages",
        input: [
          msg("agent", "", { eventId: 2 }),
          msg("agent", "", { eventId: 2 }),
          msg("agent", "Done", { eventId: 2 }),
        ],
        expected: [{ message: "Done" }],
      },
    ])("$description", ({ input, expected }) => {
      const result = build(input);
      expect(result).toHaveLength(expected.length);
      expected.forEach((exp, i) => {
        expect(result[i]).toMatchObject(exp);
      });
    });
  });

  describe("grouping by eventId + role", () => {
    it.each<{
      description: string;
      input: TranscriptEntry[];
      expected: Array<{ message: string }>;
    }>([
      {
        description:
          "keeps two non-empty agent messages with the same eventId as separate bubbles",
        input: [
          msg("agent", "before", { eventId: 2 }),
          msg("agent", "after", { eventId: 2 }),
        ],
        expected: [{ message: "before" }, { message: "after" }],
      },
      {
        description: "folds an empty placeholder into the following message",
        input: [
          msg("agent", "", { eventId: 2 }),
          msg("agent", "full", { eventId: 2 }),
        ],
        expected: [{ message: "full" }],
      },
      {
        description: "does not group messages with different eventIds",
        input: [
          msg("agent", "first", { eventId: 1 }),
          msg("agent", "second", { eventId: 2 }),
        ],
        expected: [{ message: "first" }, { message: "second" }],
      },
      {
        description: "does not group messages with different roles",
        input: [msg("agent", "hi", { eventId: 1 }), msg("user", "hey")],
        expected: [{ message: "hi" }, { message: "hey" }],
      },
    ])("$description", ({ input, expected }) => {
      const result = build(input);
      expect(result).toHaveLength(expected.length);
      expected.forEach((exp, i) => {
        expect(result[i]).toMatchObject(exp);
      });
    });

    it("does not merge non-empty agent text segments separated by a tool call", () => {
      // text > tool > text within the same turn (shared eventId). Both text
      // segments have real content, so the second must not overwrite the first —
      // a tool call separated them and the previous message is non-empty.
      const input = [
        msg("agent", "before tool", { eventId: 2 }),
        toolReq(2),
        toolRes(2),
        msg("agent", "after tool", { eventId: 2 }),
      ];
      const result = build(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ message: "before tool" });
      expect(result[1]).toMatchObject({ message: "after tool" });
    });

    it("merges empty placeholders into the final message across tool calls", () => {
      // The streamed flow brackets tool calls with empty placeholders, all
      // sharing the turn's eventId. These collapse into the single real message —
      // an empty previous message is folded in even across a tool.
      const input = [
        msg("agent", "", { eventId: 2 }),
        toolReq(2),
        toolRes(2),
        msg("agent", "Done", { eventId: 2 }),
      ];
      const result = build(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ message: "Done" });
    });

    it("folds an empty placeholder into its finalized message after a tool", () => {
      // The first segment ends, a tool runs, then a new segment starts with an
      // empty placeholder that is finalized in place. The empty placeholder
      // folds into the finalized message, leaving one bubble per segment.
      const input = [
        msg("agent", "before tool", { eventId: 2 }),
        toolReq(3),
        toolRes(3),
        msg("agent", "", { eventId: 3 }),
        msg("agent", "full", { eventId: 3 }),
      ];
      const result = build(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ message: "before tool" });
      expect(result[1]).toMatchObject({ message: "full" });
    });

    it("keeps pre-tool and post-tool messages when the tool emits no entries", () => {
      // A server-side tool runs without emitting client agent_tool_request or
      // agent_tool_response entries, so the pre-tool and post-tool replies
      // (both non-empty, sharing the turn's eventId) sit adjacent in the
      // transcript with nothing between them. They must remain separate bubbles.
      const input = [
        msg("agent", "Got it — let me look that up for you.", { eventId: 2 }),
        msg("agent", "I've looked up the pricing for you.", { eventId: 2 }),
      ];
      const result = build(input, { showAgentStatus: true });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        message: "Got it — let me look that up for you.",
      });
      expect(result[1]).toMatchObject({
        message: "I've looked up the pricing for you.",
      });
    });
  });

  describe("tool status", () => {
    it.each<{
      description: string;
      input: TranscriptEntry[];
      expected: Array<{ message?: string; toolStatus?: string }>;
    }>([
      {
        description: "skips tool request/response entries from output",
        input: [toolReq(2), toolRes(2)],
        expected: [],
      },
      {
        description: "attaches loading when tool requested but not responded",
        input: [msg("agent", "", { eventId: 2 }), toolReq(2)],
        expected: [{ message: "", toolStatus: "loading" }],
      },
      {
        description: "attaches success when all tools responded",
        input: [msg("agent", "Done", { eventId: 2 }), toolReq(2), toolRes(2)],
        expected: [{ message: "Done", toolStatus: "success" }],
      },
      {
        description: "attaches error when any tool errored",
        input: [
          msg("agent", "Done", { eventId: 2 }),
          toolReq(2),
          toolRes(2, { isError: true }),
        ],
        expected: [{ message: "Done", toolStatus: "error" }],
      },
      {
        description: "multiple tools — loading until all respond",
        input: [
          msg("agent", "", { eventId: 3 }),
          toolReq(3, "a"),
          toolReq(3, "b"),
          toolRes(3, { toolCallId: "a" }),
        ],
        expected: [{ toolStatus: "loading" }],
      },
      {
        description: "keeps empty agent message when it has tool status",
        input: [msg("agent", "", { eventId: 2 }), toolReq(2)],
        expected: [{ message: "", toolStatus: "loading" }],
      },
    ])("$description", ({ input, expected }) => {
      const result = build(input, { showAgentStatus: true });
      expect(result).toHaveLength(expected.length);
      expected.forEach((exp, i) => {
        expect(result[i]).toMatchObject(exp);
      });
    });

    it("does not attach status when showAgentStatus is false", () => {
      const input = [
        msg("agent", "Done", { eventId: 2 }),
        toolReq(2),
        toolRes(2),
      ];
      const result = build(input, { showAgentStatus: false });
      expect(result[0]).not.toHaveProperty("toolStatus");
    });

    it("attaches status to only the first bubble of a text → tool → text turn", () => {
      // Two non-empty segments share the turn's eventId and stay as separate
      // bubbles. The tool status attaches to the first (triggering) bubble only,
      // so the badge is not duplicated across both.
      const input = [
        msg("agent", "Running the tool now.", { eventId: 2 }),
        toolReq(2),
        toolRes(2),
        msg("agent", "Tool completed successfully", { eventId: 2 }),
      ];
      const result = build(input, { showAgentStatus: true });
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        message: "Running the tool now.",
        toolStatus: "success",
      });
      expect(result[1]).toMatchObject({
        message: "Tool completed successfully",
      });
      expect(result[1]).not.toHaveProperty("toolStatus");
    });
  });

  describe("transcript filtering", () => {
    it.each<{
      description: string;
      input: TranscriptEntry[];
      config: Partial<DisplayTranscriptConfig>;
      expectedLength: number;
    }>([
      {
        description:
          "filters non-text messages when transcriptEnabled is false",
        input: [
          msg("agent", "voice", { isText: false }),
          msg("user", "text", { isText: true }),
        ],
        config: { transcriptEnabled: false },
        expectedLength: 1,
      },
      {
        description: "keeps non-text messages when transcriptEnabled is true",
        input: [msg("agent", "voice", { isText: false })],
        config: { transcriptEnabled: true },
        expectedLength: 1,
      },
    ])("$description", ({ input, config, expectedLength }) => {
      expect(build(input, config)).toHaveLength(expectedLength);
    });
  });

  describe("first message prepend", () => {
    it.each<{
      description: string;
      input: TranscriptEntry[];
      config: Partial<DisplayTranscriptConfig>;
      expected: Array<{ message: string; role?: string }>;
    }>([
      {
        description: "prepends firstMessage when configured",
        input: [msg("user", "hi")],
        config: { firstMessage: "Welcome!" },
        expected: [{ role: "agent", message: "Welcome!" }, { message: "hi" }],
      },
      {
        description: "does not prepend when firstMessage is undefined",
        input: [msg("user", "hi")],
        config: {},
        expected: [{ message: "hi" }],
      },
    ])("$description", ({ input, config, expected }) => {
      const result = build(input, config);
      expect(result).toHaveLength(expected.length);
      expected.forEach((exp, i) => {
        expect(result[i]).toMatchObject(exp);
      });
    });
  });

  describe("message ordering", () => {
    it("preserves source order for same eventId messages", () => {
      const input = [
        msg("agent", "Hello!", { eventId: 1, isText: false }),
        msg("user", "Hi", { eventId: 1, isText: false }),
      ];
      const result = build(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ role: "agent", message: "Hello!" });
      expect(result[1]).toMatchObject({ role: "user", message: "Hi" });
    });

    it("same eventId: agent-only turn stays agent without invented user", () => {
      const input = [msg("agent", "Prologue", { eventId: 1, isText: true })];
      const result = build(input);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        role: "agent",
        message: "Prologue",
      });
    });

    it("local user without eventId stays before server message in same layout", () => {
      const input = [
        msg("user", "typed locally", { isText: true }),
        msg("agent", "server", { eventId: 5, isText: true }),
      ];
      const result = build(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        role: "user",
        message: "typed locally",
      });
      expect(result[1]).toMatchObject({ role: "agent", message: "server" });
    });

    it("preserves source order across different eventIds", () => {
      const input = [
        msg("agent", "Hello!", { eventId: 2, isText: false }),
        msg("user", "Hi", { eventId: 1, isText: false }),
      ];
      const result = build(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ role: "agent", message: "Hello!" });
      expect(result[1]).toMatchObject({ role: "user", message: "Hi" });
    });

    it("preserves order when eventIds are already sequential", () => {
      const input = [
        msg("user", "Hi", { eventId: 1, isText: false }),
        msg("agent", "Hello!", { eventId: 2, isText: false }),
      ];
      const result = build(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ role: "user", message: "Hi" });
      expect(result[1]).toMatchObject({ role: "agent", message: "Hello!" });
    });

    it("preserves non-message entries between messages", () => {
      const input: TranscriptEntry[] = [
        msg("agent", "Hello!", { eventId: 2, isText: false }),
        { type: "mode_toggle", mode: "text", conversationIndex: 0 },
        msg("user", "Hi", { eventId: 1, isText: false }),
      ];
      const result = build(input);
      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ role: "agent", message: "Hello!" });
      expect(result[1]).toMatchObject({ type: "mode_toggle" });
      expect(result[2]).toMatchObject({ role: "user", message: "Hi" });
    });

    it("keeps entries without eventId in their original position", () => {
      const input = [
        msg("user", "typed", { isText: true }),
        msg("agent", "response", { eventId: 5, isText: true }),
      ];
      const result = build(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ role: "user", message: "typed" });
      expect(result[1]).toMatchObject({ role: "agent", message: "response" });
    });
  });

  describe("real HAR flows", () => {
    it.each<{
      description: string;
      input: TranscriptEntry[];
      expected: Array<{ message?: string; toolStatus?: string }>;
    }>([
      {
        description: "empty start/stop + tool + real message",
        input: [
          msg("agent", "", { eventId: 2 }),
          msg("agent", "", { eventId: 2 }),
          toolReq(2),
          toolRes(2),
          msg("agent", "Done", { eventId: 2 }),
        ],
        expected: [{ message: "Done", toolStatus: "success" }],
      },
      {
        description: "multiple tool cycles with async completion",
        input: [
          msg("user", "run all"),
          msg("agent", "", { eventId: 3 }),
          toolReq(3, "a"),
          toolRes(3, { toolCallId: "a" }),
          msg("agent", "", { eventId: 3 }),
          toolReq(3, "b"),
          msg("agent", "All done", { eventId: 3 }),
        ],
        expected: [
          { message: "run all" },
          { message: "All done", toolStatus: "loading" },
        ],
      },
    ])("$description", ({ input, expected }) => {
      const result = build(input, { showAgentStatus: true });
      expect(result).toHaveLength(expected.length);
      expected.forEach((exp, i) => {
        expect(result[i]).toMatchObject(exp);
      });
    });
  });

  describe("typing indicator", () => {
    it("appends typing indicator when showTypingIndicator is true", () => {
      const input = [msg("user", "hi"), msg("agent", "hello", { eventId: 1 })];
      const result = build(input, { showTypingIndicator: true });

      expect(result).toHaveLength(3);
      expect(result[2]).toMatchObject({
        type: "typing_indicator",
        conversationIndex: 0,
      });
    });

    it("does not append typing indicator when showTypingIndicator is false", () => {
      const input = [msg("user", "hi"), msg("agent", "hello", { eventId: 1 })];
      const result = build(input, { showTypingIndicator: false });

      expect(result).toHaveLength(2);
      expect(result.every(e => e.type !== "typing_indicator")).toBe(true);
    });

    it("does not append typing indicator when showTypingIndicator is undefined", () => {
      const input = [msg("user", "hi"), msg("agent", "hello", { eventId: 1 })];
      const result = build(input);

      expect(result).toHaveLength(2);
      expect(result.every(e => e.type !== "typing_indicator")).toBe(true);
    });

    it("uses conversationIndex from last entry", () => {
      const input = [
        msg("user", "hi", { conversationIndex: 5 }),
        msg("agent", "hello", { eventId: 1, conversationIndex: 5 }),
      ];
      const result = build(input, { showTypingIndicator: true });

      expect(result[2]).toMatchObject({
        type: "typing_indicator",
        conversationIndex: 5,
      });
    });

    it("uses firstMessageConversationIndex when entries are empty", () => {
      const input: TranscriptEntry[] = [];
      const result = build(input, {
        showTypingIndicator: true,
        firstMessageConversationIndex: 42,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "typing_indicator",
        conversationIndex: 42,
      });
    });

    it("defaults conversationIndex to 0 when no entries and no firstMessageConversationIndex", () => {
      const input: TranscriptEntry[] = [];
      const result = build(input, { showTypingIndicator: true });

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        type: "typing_indicator",
        conversationIndex: 0,
      });
    });
  });

  describe("rich content past a user turn", () => {
    const richContentEntries = (result: DisplayTranscriptEntry[]) =>
      result.filter(entry => entry.type === "rich_content");

    // A user turn after a row means the customer has moved on. Agent turns do
    // not count: the tool flow puts a short agent follow-up after every row.
    it("drops a row once a user message follows it", () => {
      const result = build([
        msg("agent", "Two options", { eventId: 2 }),
        richContent("a"),
        msg("user", "the first one"),
      ]);

      expect(richContentEntries(result)).toHaveLength(0);
      expect(result).toHaveLength(2);
    });

    it("keeps a row live under agent follow-ups", () => {
      const result = build([
        msg("user", "show me options"),
        richContent("a"),
        msg("agent", "Which would you like?", { eventId: 2 }),
      ]);

      expect(richContentEntries(result)).toHaveLength(1);
      expect(result[1]).toMatchObject({ type: "rich_content" });
    });

    it("counts a filtered voice turn as the customer moving on", () => {
      // The check reads the raw entries, so a non-text user turn hidden from
      // the display still retires the row.
      const result = build(
        [richContent("a"), msg("user", "spoken reply", { isText: false })],
        { transcriptEnabled: false }
      );

      expect(richContentEntries(result)).toHaveLength(0);
    });

    it("draws no component during a voice conversation", () => {
      // The customer is speaking, so tap targets are noise — and a spoken first
      // message is a transcript entry rather than a locally prepended one, so a
      // seeded row would otherwise sit above the greeting.
      const result = build(
        [richContent("a"), msg("agent", "Hello!", { eventId: 1 })],
        { showRichContent: false }
      );

      expect(richContentEntries(result)).toHaveLength(0);
      expect(result).toHaveLength(1);
    });

    it("only user turns before the row leave it live", () => {
      const result = build([
        msg("user", "hi"),
        msg("agent", "Hello!", { eventId: 2 }),
        richContent("a"),
      ]);

      expect(richContentEntries(result)).toHaveLength(1);
      expect(result[2]).toMatchObject({ type: "rich_content" });
    });
  });

  describe("rich content", () => {
    it("keeps components where they arrived, in arrival order", () => {
      const input = [
        msg("user", "show me some options"),
        msg("agent", "Two options", { eventId: 2 }),
        richContent("a"),
        richContent("b"),
        msg("agent", "Anything else?", { eventId: 2 }),
      ];
      const result = build(input);

      expect(result).toHaveLength(5);
      expect(result[1]).toMatchObject({ message: "Two options" });
      expect(result[2]).toMatchObject({ richContentId: "rc_a" });
      expect(result[3]).toMatchObject({ richContentId: "rc_b" });
      expect(result[4]).toMatchObject({ message: "Anything else?" });
    });

    it("keeps a component above the reply even when a placeholder precedes it", () => {
      // The placeholder survives only because it carries the status badge.
      const input = [
        msg("agent", "", { eventId: 2 }),
        toolReq(2),
        toolRes(2),
        richContent(),
        msg("agent", "Here you go", { eventId: 2 }),
      ];
      const result = build(input, { showAgentStatus: true });

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({ message: "", toolStatus: "success" });
      expect(result[1]).toMatchObject({ type: "rich_content" });
      expect(result[2]).toMatchObject({ message: "Here you go" });
    });

    it("drops the placeholder a component follows when there is no badge", () => {
      // With no status to show, nothing keeps the empty placeholder.
      const input = [
        msg("agent", "", { eventId: 2 }),
        richContent(),
        msg("agent", "Here you go", { eventId: 2 }),
      ];
      const result = build(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ type: "rich_content" });
      expect(result[1]).toMatchObject({ message: "Here you go" });
    });

    it("places components above the reply for a real captured turn", () => {
      // Replays the order the backend produces: empty text windows while the
      // model calls the tool, a component per call, then the reply that
      // introduces them.
      const input = [
        msg("user", "show me some options"),
        msg("agent", "", { eventId: 2 }),
        toolRes(2),
        msg("agent", "", { eventId: 2 }),
        richContent("a", { eventId: 2 }),
        toolRes(2),
        richContent("b", { eventId: 2 }),
        toolRes(2),
        msg("agent", "Here are some options.", { eventId: 2 }),
      ];

      for (const showAgentStatus of [false, true]) {
        const result = build(input, { showAgentStatus });

        expect(result).toHaveLength(4);
        expect(result[0]).toMatchObject({ role: "user" });
        expect(result[1]).toMatchObject({ richContentId: "rc_a" });
        expect(result[2]).toMatchObject({ richContentId: "rc_b" });
        expect(result[3]).toMatchObject({ message: "Here are some options." });
      }
    });

    it("leaves the tool status badge on the first bubble of the turn", () => {
      const input = [
        msg("agent", "Running the tool now.", { eventId: 2 }),
        toolReq(2),
        toolRes(2),
        richContent(),
        msg("agent", "Tool completed successfully", { eventId: 2 }),
      ];
      const result = build(input, { showAgentStatus: true });

      expect(result).toHaveLength(3);
      expect(result[0]).toMatchObject({
        message: "Running the tool now.",
        toolStatus: "success",
      });
      expect(result[1]).toMatchObject({ type: "rich_content" });
      expect(result[2]).toMatchObject({
        message: "Tool completed successfully",
      });
      expect(result[2]).not.toHaveProperty("toolStatus");
    });

    it("places a component before an appended typing indicator", () => {
      const input = [
        msg("agent", "Here you go", { eventId: 2 }),
        richContent(),
      ];
      const result = build(input, { showTypingIndicator: true });

      expect(result).toHaveLength(3);
      expect(result[1]).toMatchObject({ type: "rich_content" });
      expect(result[2]).toMatchObject({ type: "typing_indicator" });
    });
  });
});
