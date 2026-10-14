import { beforeEach, describe, expect, it, vi } from "vitest";

// Capture the inlined worklet source so the test runs the exact code that
// ships, rather than a copy of it
const { workletSource } = vi.hoisted(() => ({
  workletSource: { current: "" },
}));
vi.mock("./createWorkletModuleLoader.js", () => ({
  createWorkletModuleLoader: (_name: string, source: string) => {
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
const alignment = {
  chars: ["H", "i"],
  char_start_times_ms: [0, 50],
  char_durations_ms: [50, 50],
};

describe("audioConcatProcessor", () => {
  let processor: Processor;

  function send(data: WorkletMessage) {
    processor.port.onmessage({ data });
  }

  function queue(samples: number, metadata?: WorkletMessage) {
    send({ type: "buffer", buffer: new Int16Array(samples).buffer, metadata });
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

  it("posts chunk_start with the chunk's metadata when it starts playing", () => {
    queue(QUANTUM * 2, { event_id: 1, alignment });
    queue(QUANTUM, { event_id: 2, alignment });

    render();
    expect(chunkStarts()).toEqual([
      { type: "chunk_start", event_id: 1, alignment },
    ]);

    render();
    expect(chunkStarts()).toHaveLength(1);

    render();
    expect(chunkStarts()).toEqual([
      { type: "chunk_start", event_id: 1, alignment },
      { type: "chunk_start", event_id: 2, alignment },
    ]);
  });

  it("does not post chunk_start for chunks without metadata", () => {
    queue(QUANTUM);

    render();

    expect(chunkStarts()).toEqual([]);
  });

  it("does not post chunk_start for chunks flushed by an interruption", () => {
    queue(QUANTUM, { event_id: 1, alignment });
    queue(QUANTUM, { event_id: 2, alignment });

    render();
    send({ type: "interrupt" });
    send({ type: "clearInterrupted" });
    render();

    expect(chunkStarts()).toEqual([
      { type: "chunk_start", event_id: 1, alignment },
    ]);
  });
});
