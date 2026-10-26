import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Runs the worklet source that ships rather than a copy of it
const { workletSource } = vi.hoisted(() => ({
  workletSource: { current: "" },
}));
vi.mock("./createWorkletModuleLoader.js", () => ({
  createWorkletModuleLoader: (_name: string, _hash: string, source: string) => {
    workletSource.current = source;
    return async () => {};
  },
}));
await import("./audioConcatProcessor.generated.js");

type WorkletMessage = Record<string, unknown>;

type Processor = {
  port: {
    onmessage: (event: { data: WorkletMessage }) => void;
    postMessage: ReturnType<typeof vi.fn>;
  };
  process(inputs: unknown, outputs: Float32Array[][]): boolean;
};

function createProcessor(contextSampleRate = 16000): Processor {
  class FakeAudioWorkletProcessor {
    port = {
      onmessage: (_event: { data: WorkletMessage }) => {},
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

const QUANTUM = 128;

describe("audioConcatProcessor", () => {
  let processor: Processor;

  function send(data: WorkletMessage) {
    processor.port.onmessage({ data });
  }

  function queue(samples: number, chunkId?: number, value = 0) {
    send({
      type: "buffer",
      buffer: new Int16Array(samples).fill(value).buffer,
      chunkId,
    });
  }

  function render() {
    const output = new Float32Array(QUANTUM);
    processor.process([], [[output]]);
    return output;
  }

  function postedMessages() {
    return processor.port.postMessage.mock.calls.map(
      ([message]) => message as WorkletMessage
    );
  }

  function chunkStarts() {
    return postedMessages().filter(message => message.type === "chunk_start");
  }

  describe("without resampling", () => {
    beforeEach(() => {
      processor = createProcessor();
      send({ type: "setFormat", format: "pcm", sampleRate: 16000 });
    });

    it("posts chunk_start with the chunk's id when it starts playing", () => {
      queue(QUANTUM * 2, 1);
      queue(QUANTUM, 2);

      render();
      expect(chunkStarts()).toEqual([{ type: "chunk_start", chunkId: 1 }]);

      render();
      expect(chunkStarts()).toHaveLength(1);

      render();
      expect(chunkStarts()).toEqual([
        { type: "chunk_start", chunkId: 1 },
        { type: "chunk_start", chunkId: 2 },
      ]);
    });
  });

  describe("with resampling", () => {
    const AGENT_SAMPLE_RATE = 16000;
    const CONTEXT_SAMPLE_RATE = 48000;
    const RATIO = CONTEXT_SAMPLE_RATE / AGENT_SAMPLE_RATE;
    const SAMPLE = 1000;

    let resolveResampler: (resampler: unknown) => void;
    let rejectResampler: (error: unknown) => void;
    let create: ReturnType<typeof vi.fn>;

    // Repeats each sample so playback length reveals whether audio was resampled
    const fakeResampler = {
      full: (samples: Int16Array) => {
        const out = new Float32Array(samples.length * RATIO);
        for (let i = 0; i < out.length; i++) {
          out[i] = samples[Math.floor(i / RATIO)];
        }
        return out;
      },
    };

    function flushPromises() {
      return new Promise(resolve => setTimeout(resolve, 0));
    }

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
      send({ type: "setFormat", format: "pcm", sampleRate: AGENT_SAMPLE_RATE });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      vi.restoreAllMocks();
    });

    it("creates a resampler from the agent's rate to the context's rate", () => {
      expect(create).toHaveBeenCalledWith(
        1,
        AGENT_SAMPLE_RATE,
        CONTEXT_SAMPLE_RATE
      );
    });

    it("holds audio that arrives before the resampler is ready", async () => {
      queue(QUANTUM, 1, SAMPLE);

      expect(render()).toEqual(new Float32Array(QUANTUM));
      expect(render()).toEqual(new Float32Array(QUANTUM));
      expect(chunkStarts()).toEqual([]);
      expect(postedMessages()).toEqual([]);

      resolveResampler(fakeResampler);
      await flushPromises();

      // One source chunk now fills RATIO quanta instead of one
      for (let i = 0; i < RATIO; i++) {
        expect(render()).toEqual(
          new Float32Array(QUANTUM).fill(SAMPLE / 32768)
        );
      }
      expect(render()).toEqual(new Float32Array(QUANTUM));
      expect(chunkStarts()).toEqual([{ type: "chunk_start", chunkId: 1 }]);
      expect(postedMessages()).toContainEqual({
        type: "process",
        finished: true,
      });
    });

    it("drops held audio when interrupted before the resampler is ready", async () => {
      queue(QUANTUM, 1, SAMPLE);
      send({ type: "interrupt" });
      send({ type: "clearInterrupted" });

      resolveResampler(fakeResampler);
      await flushPromises();

      expect(render()).toEqual(new Float32Array(QUANTUM));
      expect(chunkStarts()).toEqual([]);
    });

    it("plays audio unresampled if the resampler fails to load", async () => {
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});
      queue(QUANTUM, 1, SAMPLE);

      rejectResampler(new Error("failed to load"));
      await flushPromises();

      expect(consoleError).toHaveBeenCalled();
      expect(render()).toEqual(new Float32Array(QUANTUM).fill(SAMPLE / 32768));
      expect(render()).toEqual(new Float32Array(QUANTUM));
      expect(chunkStarts()).toEqual([{ type: "chunk_start", chunkId: 1 }]);
    });
  });
});
