import { beforeEach, describe, expect, it, vi } from "vitest";

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

function createProcessor(): Processor {
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
  )(FakeAudioWorkletProcessor, registerProcessor, 16000);
  return new Processor!();
}

const QUANTUM = 128;

describe("audioConcatProcessor", () => {
  let processor: Processor;

  function send(data: WorkletMessage) {
    processor.port.onmessage({ data });
  }

  function queue(samples: number, chunkId?: number) {
    send({ type: "buffer", buffer: new Int16Array(samples).buffer, chunkId });
  }

  function render() {
    processor.process([], [[new Float32Array(QUANTUM)]]);
  }

  function chunkStarts() {
    return processor.port.postMessage.mock.calls
      .map(([message]) => message as WorkletMessage)
      .filter(message => message.type === "chunk_start");
  }

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
