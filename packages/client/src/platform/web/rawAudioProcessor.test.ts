import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { workletSource } = vi.hoisted(() => ({
  workletSource: { current: "" },
}));
vi.mock("./createWorkletModuleLoader.js", () => ({
  createWorkletModuleLoader: (_name: string, _hash: string, source: string) => {
    workletSource.current = source;
    return async () => {};
  },
}));
await import("./rawAudioProcessor.generated.js");

type AudioMessage = [Int16Array, number];
type WorkletMessage = Record<string, unknown> | AudioMessage;

type Processor = {
  port: {
    onmessage: (event: { data: Record<string, unknown> }) => void;
    postMessage: ReturnType<typeof vi.fn>;
  };
  process(inputs: Float32Array[][]): boolean;
};

function createProcessor(contextSampleRate: number): Processor {
  class FakeAudioWorkletProcessor {
    port = {
      onmessage: (_event: { data: Record<string, unknown> }) => {},
      postMessage: vi.fn(),
    };
  }
  let Processor: (new () => Processor) | undefined;
  const registerProcessor = (_name: string, cls: new () => Processor) => {
    Processor = cls;
  };
  new Function(
    "AudioWorkletProcessor",
    "registerProcessor",
    "sampleRate",
    workletSource.current
  )(FakeAudioWorkletProcessor, registerProcessor, contextSampleRate);
  return new Processor!();
}

const AGENT_SAMPLE_RATE = 16000;
const CONTEXT_SAMPLE_RATE = 48000;
const RATIO = CONTEXT_SAMPLE_RATE / AGENT_SAMPLE_RATE;
const QUANTUM = 128;
const CHUNK_DURATION_MS = 25;
const CHUNK_SAMPLES = (AGENT_SAMPLE_RATE * CHUNK_DURATION_MS) / 1000;
const QUANTA_PER_CHUNK = Math.ceil(CHUNK_SAMPLES / QUANTUM);
const RESAMPLED = 0.5;

describe("rawAudioProcessor", () => {
  let processor: Processor;

  function setFormat(sampleRate = AGENT_SAMPLE_RATE) {
    processor.port.onmessage({
      data: {
        type: "setFormat",
        format: "pcm",
        sampleRate,
        chunkDurationMs: CHUNK_DURATION_MS,
      },
    });
  }

  function capture(quanta: number) {
    for (let i = 0; i < quanta; i++) {
      processor.process([[new Float32Array(QUANTUM).fill(0.1)]]);
    }
  }

  function postedMessages() {
    return processor.port.postMessage.mock.calls.map(
      ([message]) => message as WorkletMessage
    );
  }

  function audioChunks() {
    return postedMessages()
      .filter((message): message is AudioMessage => Array.isArray(message))
      .map(([audio]) => audio);
  }

  function flushPromises() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  describe("without resampling", () => {
    beforeEach(() => {
      processor = createProcessor(AGENT_SAMPLE_RATE);
      setFormat();
    });

    it("sends audio without resampler messages", async () => {
      capture(QUANTA_PER_CHUNK);
      await flushPromises();

      expect(postedMessages().every(Array.isArray)).toBe(true);
      expect(audioChunks()).toHaveLength(1);
    });
  });

  describe("with resampling", () => {
    let resolveResampler: (resampler: unknown) => void;
    let rejectResampler: (error: unknown) => void;
    let create: ReturnType<typeof vi.fn>;

    const fakeResampler = {
      full: (samples: Float32Array) =>
        new Float32Array(Math.round(samples.length / RATIO)).fill(RESAMPLED),
    };

    beforeEach(() => {
      create = vi.fn(
        () =>
          new Promise((resolve, reject) => {
            resolveResampler = resolve;
            rejectResampler = reject;
          })
      );
      vi.stubGlobal("LibSampleRate", { create });
      processor = createProcessor(CONTEXT_SAMPLE_RATE);
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("drops audio until the resampler is ready, then sends it resampled", async () => {
      setFormat();
      expect(create).toHaveBeenCalledWith(
        1,
        CONTEXT_SAMPLE_RATE,
        AGENT_SAMPLE_RATE
      );
      capture(QUANTA_PER_CHUNK);
      await flushPromises();
      expect(postedMessages()).toEqual([]);

      resolveResampler(fakeResampler);
      await flushPromises();
      expect(postedMessages()).toEqual([{ type: "resampler_ready" }]);

      capture(RATIO * QUANTA_PER_CHUNK);
      const chunks = audioChunks();
      expect(chunks.length).toBeGreaterThan(0);
      for (const chunk of chunks) {
        expect(chunk).toEqual(
          new Int16Array(chunk.length).fill(RESAMPLED * 32767)
        );
      }
    });

    it("posts resampler_error and sends no audio if the resampler fails to load", async () => {
      setFormat();
      rejectResampler("invalid outputSampleRate");
      await flushPromises();
      capture(RATIO * QUANTA_PER_CHUNK);

      expect(postedMessages()).toEqual([
        { type: "resampler_error", message: "invalid outputSampleRate" },
      ]);
    });

    it("posts resampler_error and sends no audio if libsamplerate is not loaded", async () => {
      vi.unstubAllGlobals();
      setFormat();
      await flushPromises();
      capture(RATIO * QUANTA_PER_CHUNK);

      expect(postedMessages()).toEqual([
        { type: "resampler_error", message: "libsamplerate is not loaded" },
      ]);
    });

    it("rejects a second setFormat", async () => {
      setFormat();
      expect(() => setFormat(24000)).toThrow("setFormat can only be sent once");
      expect(create).toHaveBeenCalledTimes(1);

      resolveResampler(fakeResampler);
      await flushPromises();
      expect(postedMessages()).toEqual([{ type: "resampler_ready" }]);
    });
  });
});
