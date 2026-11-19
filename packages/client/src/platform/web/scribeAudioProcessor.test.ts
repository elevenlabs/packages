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
await import("./scribeAudioProcessor.generated.js");

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

const TARGET_SAMPLE_RATE = 16000;
const CONTEXT_SAMPLE_RATE = 48000;
const QUANTUM = 128;
const CHUNK_SAMPLES = 4096;
const INPUT = 0.25;
const RESAMPLED = 0.5;
const RESAMPLED_PER_QUANTUM = 32;
const QUANTA_PER_CHUNK = CHUNK_SAMPLES / RESAMPLED_PER_QUANTUM;

describe("scribeAudioProcessor", () => {
  let processor: Processor;

  function configure() {
    processor.port.onmessage({
      data: { type: "configure", outputSampleRate: TARGET_SAMPLE_RATE },
    });
  }

  function capture(quanta: number) {
    for (let i = 0; i < quanta; i++) {
      processor.process([[new Float32Array(QUANTUM).fill(INPUT)]]);
    }
  }

  function postedMessages() {
    return processor.port.postMessage.mock.calls.map(([message]) => message);
  }

  function audioChunks() {
    return postedMessages()
      .filter(message => "audioData" in message)
      .map(({ audioData }) => new Int16Array(audioData));
  }

  function flushPromises() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  describe("at the target sample rate", () => {
    beforeEach(() => {
      processor = createProcessor(TARGET_SAMPLE_RATE);
    });

    it("is ready at once and sends audio untouched", () => {
      configure();
      capture(CHUNK_SAMPLES / QUANTUM);

      expect(postedMessages()[0]).toEqual({ type: "resampler_ready" });
      expect(audioChunks()).toEqual([
        new Int16Array(CHUNK_SAMPLES).fill(INPUT * 32767),
      ]);
    });
  });

  describe("above the target sample rate", () => {
    let resolveResampler: (resampler: unknown) => void;
    let rejectResampler: (error: unknown) => void;
    let create: ReturnType<typeof vi.fn>;

    const fakeResampler = {
      full: () => new Float32Array(RESAMPLED_PER_QUANTUM).fill(RESAMPLED),
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

    it("drops audio until libsamplerate is ready, then sends only its output", async () => {
      configure();
      expect(create).toHaveBeenCalledWith(
        1,
        CONTEXT_SAMPLE_RATE,
        TARGET_SAMPLE_RATE
      );
      capture(QUANTA_PER_CHUNK);
      expect(postedMessages()).toEqual([]);

      resolveResampler(fakeResampler);
      await flushPromises();
      capture(QUANTA_PER_CHUNK);

      expect(postedMessages()[0]).toEqual({ type: "resampler_ready" });
      expect(audioChunks()).toEqual([
        new Int16Array(CHUNK_SAMPLES).fill(RESAMPLED * 32767),
      ]);
    });

    it("posts resampler_error and sends no audio if the resampler fails", async () => {
      configure();
      rejectResampler(new Error("invalid outputSampleRate"));
      await flushPromises();
      capture(QUANTA_PER_CHUNK);

      expect(postedMessages()).toEqual([
        { type: "resampler_error", message: "invalid outputSampleRate" },
      ]);
    });

    it("posts resampler_error and sends no audio if libsamplerate is not loaded", async () => {
      vi.unstubAllGlobals();
      configure();
      await flushPromises();
      capture(QUANTA_PER_CHUNK);

      expect(postedMessages()).toEqual([
        { type: "resampler_error", message: "libsamplerate is not loaded" },
      ]);
    });
  });
});
