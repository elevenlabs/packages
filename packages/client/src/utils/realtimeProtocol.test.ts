import { describe, it, expect, beforeEach } from "vitest";
import {
  RealtimeProtocolTranslator,
  RealtimeUnsupportedFeatureError,
  type RealtimeClientEvent,
} from "./realtimeProtocol.js";
import type { IncomingSocketEvent } from "./events.js";
import { arrayBufferToBase64 } from "./audio.js";

const PCM_24K_BYTES_PER_MS = 48;

function pcmChunk(durationMs: number): string {
  return arrayBufferToBase64(
    new ArrayBuffer(durationMs * PCM_24K_BYTES_PER_MS)
  );
}

describe("RealtimeProtocolTranslator", () => {
  let emitted: IncomingSocketEvent[];
  let sent: RealtimeClientEvent[];
  let now: number;
  let translator: RealtimeProtocolTranslator;

  function createTranslator(interruptOnSpeech = true) {
    translator = new RealtimeProtocolTranslator({
      outputFormat: { format: "pcm", sampleRate: 24000 },
      interruptOnSpeech,
      emit: event => emitted.push(event),
      send: event => sent.push(event),
      now: () => now,
    });
  }

  beforeEach(() => {
    emitted = [];
    sent = [];
    now = 10_000;
    createTranslator();
  });

  function startResponse(id: string) {
    translator.handleServerEvent({
      type: "response.created",
      response: { id, status: "in_progress" },
    });
  }

  function audioDelta(responseId: string, itemId: string, durationMs: number) {
    translator.handleServerEvent({
      type: "response.output_audio.delta",
      response_id: responseId,
      item_id: itemId,
      output_index: 0,
      content_index: 0,
      delta: pcmChunk(durationMs),
    });
  }

  function finishResponse(id: string, status: string, output: unknown[] = []) {
    translator.handleServerEvent({
      type: "response.done",
      response: { id, status, output },
    });
  }

  function assistantMessage(id: string, transcript: string) {
    return {
      id,
      type: "message",
      role: "assistant",
      content: [{ type: "output_audio", transcript }],
    };
  }

  describe("agent turns", () => {
    it("streams text, audio and the final response in native order", () => {
      startResponse("resp_1");
      translator.handleServerEvent({
        type: "response.output_audio_transcript.delta",
        response_id: "resp_1",
        item_id: "item_1",
        delta: "Hello",
      });
      audioDelta("resp_1", "item_1", 100);
      translator.handleServerEvent({
        type: "response.output_audio_transcript.delta",
        response_id: "resp_1",
        item_id: "item_1",
        delta: " there",
      });
      finishResponse("resp_1", "completed", [
        assistantMessage("item_1", "Hello there"),
      ]);

      expect(emitted.map(e => e.type)).toEqual([
        "agent_chat_response_part",
        "agent_chat_response_part",
        "audio",
        "agent_chat_response_part",
        "agent_response",
        "agent_chat_response_part",
      ]);
      expect(emitted[0]).toEqual({
        type: "agent_chat_response_part",
        text_response_part: {
          text: "",
          type: "start",
          event_id: 1,
          response_id: "resp_1",
        },
      });
      expect(emitted[2]).toEqual({
        type: "audio",
        audio_event: { audio_base_64: pcmChunk(100), event_id: 1 },
      });
      expect(emitted[4]).toEqual({
        type: "agent_response",
        agent_response_event: {
          agent_response: "Hello there",
          event_id: 1,
          response_id: "resp_1",
        },
      });
      expect(emitted[5]).toMatchObject({
        text_response_part: { type: "stop" },
      });
    });

    it("uses text deltas for text-only responses", () => {
      startResponse("resp_1");
      translator.handleServerEvent({
        type: "response.output_text.delta",
        response_id: "resp_1",
        delta: "Hi",
      });
      finishResponse("resp_1", "completed", [
        {
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: "Hi" }],
        },
      ]);

      expect(emitted.find(e => e.type === "agent_response")).toMatchObject({
        agent_response_event: { agent_response: "Hi" },
      });
    });

    it("assigns increasing event ids to responses and user transcripts", () => {
      startResponse("resp_1");
      finishResponse("resp_1", "completed", [assistantMessage("i1", "One")]);
      translator.handleServerEvent({
        type: "conversation.item.input_audio_transcription.completed",
        item_id: "user_1",
        transcript: "Hey",
      });
      startResponse("resp_2");
      finishResponse("resp_2", "completed", [assistantMessage("i2", "Two")]);

      expect(
        emitted.flatMap(e =>
          e.type === "agent_response"
            ? [e.agent_response_event.event_id]
            : e.type === "user_transcript"
              ? [e.user_transcription_event.event_id]
              : []
        )
      ).toEqual([1, 2, 3]);
      expect(emitted[1]).toEqual({
        type: "user_transcript",
        user_transcription_event: { user_transcript: "Hey", event_id: 2 },
      });
    });

    it("reports failed responses as errors", () => {
      startResponse("resp_1");
      translator.handleServerEvent({
        type: "response.done",
        response: {
          id: "resp_1",
          status: "failed",
          output: [],
          status_details: {
            type: "failed",
            error: { type: "server_error", code: "llm_error" },
          },
        },
      });

      expect(emitted).toEqual([
        {
          type: "error",
          error_event: expect.objectContaining({
            code: 1011,
            message: "llm_error",
          }),
        },
      ]);
    });
  });

  describe("voice activity", () => {
    it("maps speech start and stop to VAD scores", () => {
      translator.handleServerEvent({
        type: "input_audio_buffer.speech_started",
        audio_start_ms: 0,
        item_id: "user_1",
      });
      translator.handleServerEvent({
        type: "input_audio_buffer.speech_stopped",
        audio_end_ms: 500,
        item_id: "user_1",
      });

      expect(emitted).toEqual([
        { type: "vad_score", vad_score_event: { vad_score: 1 } },
        { type: "vad_score", vad_score_event: { vad_score: 0 } },
      ]);
    });
  });

  describe("interruptions", () => {
    function speechStarted() {
      translator.handleServerEvent({
        type: "input_audio_buffer.speech_started",
        audio_start_ms: 0,
        item_id: "user_1",
      });
    }

    it("interrupts playback and truncates to the audio the user heard", () => {
      startResponse("resp_1");
      audioDelta("resp_1", "item_1", 1000);
      audioDelta("resp_1", "item_1", 1000);
      finishResponse("resp_1", "completed", [
        assistantMessage("item_1", "A long answer that keeps going"),
      ]);

      now += 700;
      speechStarted();

      const interruption = emitted.find(e => e.type === "interruption");
      expect(interruption).toEqual({
        type: "interruption",
        interruption_event: { event_id: 2 },
      });
      expect(sent).toEqual([
        {
          type: "conversation.item.truncate",
          item_id: "item_1",
          content_index: 0,
          audio_end_ms: 700,
          event_id: "sdk_1",
        },
      ]);

      translator.handleServerEvent({
        type: "conversation.item.truncated",
        item_id: "item_1",
        content_index: 0,
        audio_end_ms: 700,
      });
      expect(sent[1]).toEqual({
        type: "conversation.item.retrieve",
        item_id: "item_1",
        event_id: "sdk_2",
      });

      translator.handleServerEvent({
        type: "conversation.item.retrieved",
        item: assistantMessage("item_1", "A long answer"),
      });
      expect(emitted.at(-1)).toEqual({
        type: "agent_response_correction",
        agent_response_correction_event: {
          original_agent_response: "A long answer that keeps going",
          corrected_agent_response: "A long answer",
          event_id: 1,
          response_id: "resp_1",
        },
      });
    });

    it("defers truncation until the interrupted response is done", () => {
      startResponse("resp_1");
      audioDelta("resp_1", "item_1", 1000);
      now += 300;
      speechStarted();

      expect(emitted.some(e => e.type === "interruption")).toBe(true);
      expect(sent).toEqual([]);

      audioDelta("resp_1", "item_1", 1000);
      expect(emitted.filter(e => e.type === "audio")).toHaveLength(1);

      finishResponse("resp_1", "cancelled", [
        assistantMessage("item_1", "Partial"),
      ]);
      expect(sent).toEqual([
        expect.objectContaining({
          type: "conversation.item.truncate",
          audio_end_ms: 300,
        }),
      ]);
    });

    it("does not interrupt once playback has finished", () => {
      startResponse("resp_1");
      audioDelta("resp_1", "item_1", 500);
      finishResponse("resp_1", "completed", [assistantMessage("item_1", "Hi")]);

      now += 600;
      speechStarted();

      expect(emitted.some(e => e.type === "interruption")).toBe(false);
      expect(sent).toEqual([]);
    });

    it("keeps playing when interruptResponse is disabled", () => {
      createTranslator(false);
      startResponse("resp_1");
      audioDelta("resp_1", "item_1", 1000);
      now += 100;
      speechStarted();

      expect(emitted.some(e => e.type === "interruption")).toBe(false);
    });

    it("gives the next response an event id above the interruption", () => {
      startResponse("resp_1");
      audioDelta("resp_1", "item_1", 1000);
      now += 100;
      speechStarted();
      finishResponse("resp_1", "cancelled");
      startResponse("resp_2");
      audioDelta("resp_2", "item_2", 100);

      const interruption = emitted.find(e => e.type === "interruption");
      const audio = emitted.filter(e => e.type === "audio").at(-1);
      expect(
        interruption?.type === "interruption" &&
          interruption.interruption_event.event_id
      ).toBe(2);
      expect(audio?.type === "audio" && audio.audio_event.event_id).toBe(3);
    });

    it("ignores errors caused by its own requests", () => {
      startResponse("resp_1");
      audioDelta("resp_1", "item_1", 1000);
      finishResponse("resp_1", "completed", [assistantMessage("item_1", "Hi")]);
      now += 100;
      speechStarted();
      emitted = [];

      translator.handleServerEvent({
        type: "error",
        error: {
          type: "invalid_request_error",
          message: "audio_end_ms is out of range",
          event_id: "sdk_1",
        },
      });

      expect(emitted).toEqual([]);
    });
  });

  describe("client tools", () => {
    it("calls client tools from completed responses and resumes once all results are in", () => {
      startResponse("resp_1");
      finishResponse("resp_1", "completed", [
        {
          type: "function_call",
          call_id: "call_1",
          name: "get_weather",
          arguments: '{"city":"Paris"}',
        },
        {
          type: "function_call",
          call_id: "call_2",
          name: "get_time",
          arguments: "",
        },
      ]);

      expect(emitted).toEqual([
        {
          type: "client_tool_call",
          client_tool_call: {
            tool_name: "get_weather",
            tool_call_id: "call_1",
            parameters: { city: "Paris" },
            event_id: 1,
          },
        },
        {
          type: "client_tool_call",
          client_tool_call: {
            tool_name: "get_time",
            tool_call_id: "call_2",
            parameters: {},
            event_id: 1,
          },
        },
      ]);

      translator.handleOutgoingEvent({
        type: "client_tool_result",
        tool_call_id: "call_1",
        result: "Sunny",
        is_error: false,
      });
      expect(sent).toEqual([
        {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: "call_1",
            output: "Sunny",
          },
        },
      ]);

      translator.handleOutgoingEvent({
        type: "client_tool_result",
        tool_call_id: "call_2",
        result: "Noon",
        is_error: false,
      });
      expect(sent.slice(1)).toEqual([
        {
          type: "conversation.item.create",
          item: {
            type: "function_call_output",
            call_id: "call_2",
            output: "Noon",
          },
        },
        { type: "response.create" },
      ]);
    });

    it("does not call tools from responses that did not complete", () => {
      startResponse("resp_1");
      finishResponse("resp_1", "cancelled", [
        {
          type: "function_call",
          call_id: "call_1",
          name: "get_weather",
          arguments: "{}",
        },
      ]);

      expect(emitted.some(e => e.type === "client_tool_call")).toBe(false);
    });
  });

  describe("outgoing events", () => {
    it("appends user audio to the input buffer", () => {
      translator.handleOutgoingEvent({ user_audio_chunk: "AAAA" });

      expect(sent).toEqual([
        { type: "input_audio_buffer.append", audio: "AAAA" },
      ]);
    });

    it("sends user messages and requests a response", () => {
      translator.handleOutgoingEvent({ type: "user_message", text: "Hi" });

      expect(sent).toEqual([
        {
          type: "conversation.item.create",
          item: {
            type: "message",
            role: "user",
            content: [{ type: "input_text", text: "Hi" }],
          },
        },
        { type: "response.create" },
      ]);
    });

    it("cancels the active response before sending a user message", () => {
      startResponse("resp_1");
      audioDelta("resp_1", "item_1", 1000);
      translator.handleOutgoingEvent({ type: "user_message", text: "Stop" });

      expect(emitted.some(e => e.type === "interruption")).toBe(true);
      expect(sent.map(e => e.type)).toEqual([
        "response.cancel",
        "conversation.item.create",
        "response.create",
      ]);
    });

    it("drops events that have no wire equivalent but need none", () => {
      translator.handleOutgoingEvent({ type: "pong", event_id: 1 });
      translator.handleOutgoingEvent({ type: "user_activity" });

      expect(sent).toEqual([]);
    });

    it.each([
      { type: "contextual_update", text: "The user is on the pricing page" },
      { type: "feedback", score: "like", event_id: 1 },
      { type: "multimodal_message", text: { type: "user_message", text: "x" } },
      {
        type: "mcp_tool_approval_result",
        tool_call_id: "t",
        is_approved: true,
      },
    ] as const)("rejects $type", message => {
      expect(() => translator.handleOutgoingEvent(message as never)).toThrow(
        RealtimeUnsupportedFeatureError
      );
      expect(sent).toEqual([]);
    });
  });
});
