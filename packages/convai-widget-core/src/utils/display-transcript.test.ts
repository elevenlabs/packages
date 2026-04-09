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

/** Default config — no status, transcript enabled */
const defaults: DisplayTranscriptConfig = {
  showAgentStatus: false,
  transcriptEnabled: true,
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
        description: "groups consecutive agent messages with same eventId",
        input: [
          msg("agent", "partial", { eventId: 2 }),
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

  describe("eventId sorting", () => {
    it("reorders agent before user when agent_response arrives first in voice mode", () => {
      const input = [
        msg("agent", "Hello!", { eventId: 2, isText: false }),
        msg("user", "Hi", { eventId: 1, isText: false }),
      ];
      const result = build(input);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ role: "user", message: "Hi" });
      expect(result[1]).toMatchObject({ role: "agent", message: "Hello!" });
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
});
