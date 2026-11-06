import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaDeviceOutput } from "./output.js";

const { loadWorklet, workletSource } = vi.hoisted(() => ({
  loadWorklet: vi.fn(),
  workletSource: { current: "" },
}));
vi.mock("./createWorkletModuleLoader.js", () => ({
  createWorkletModuleLoader: (_name: string, _hash: string, source: string) => {
    workletSource.current = source;
    return loadWorklet;
  },
}));
vi.mock("./volumeProvider.js", () => ({
  createAnalyserVolumeProvider: () => ({
    getVolume: () => 0,
    getByteFrequencyData: () => {},
  }),
}));
vi.mock("./compatibility.js", () => ({ isIosDevice: () => false }));

describe("MediaDeviceOutput recovery", () => {
  const listeners = new Map<string, Set<() => void>>();
  let context: any;
  let worklet: any;
  let element: any;
  let onWorkletMessage: ((event: MessageEvent) => void) | undefined;

  async function setup() {
    listeners.clear();
    onWorkletMessage = undefined;
    context = {
      state: "running",
      currentTime: 0,
      sampleRate: 16000,
      resume: vi.fn(async () => {
        context.state = "running";
      }),
      close: vi.fn(async () => {
        context.state = "closed";
      }),
      addEventListener: vi.fn((type: string, callback: () => void) => {
        if (!listeners.has(type)) listeners.set(type, new Set());
        listeners.get(type)!.add(callback);
      }),
      removeEventListener: vi.fn((type: string, callback: () => void) =>
        listeners.get(type)?.delete(callback)
      ),
      createAnalyser: () => ({ connect: vi.fn() }),
      createGain: () => ({
        gain: { value: 1, cancelScheduledValues: vi.fn() },
        connect: vi.fn(),
      }),
      createMediaStreamDestination: () => ({ stream: {} }),
    };
    worklet = {
      port: {
        postMessage: vi.fn(),
        addEventListener: vi.fn(
          (type: string, callback: (event: MessageEvent) => void) => {
            if (type === "message") onWorkletMessage = callback;
          }
        ),
        start: vi.fn(),
      },
      connect: vi.fn(),
    };
    loadWorklet.mockResolvedValue(worklet);
    element = {
      style: {},
      load: vi.fn(),
      pause: vi.fn(),
      play: vi.fn(),
      parentNode: { removeChild: vi.fn() },
    };
    vi.stubGlobal(
      "Audio",
      vi.fn(function AudioMock() {
        return element;
      })
    );
    vi.stubGlobal("navigator", {
      mediaDevices: { getSupportedConstraints: () => ({ sampleRate: true }) },
    });
    vi.stubGlobal("document", {
      visibilityState: "visible",
      body: { appendChild: vi.fn() },
      addEventListener: vi.fn((type: string, callback: () => void) => {
        if (!listeners.has(`doc:${type}`))
          listeners.set(`doc:${type}`, new Set());
        listeners.get(`doc:${type}`)!.add(callback);
      }),
      removeEventListener: vi.fn((type: string, callback: () => void) =>
        listeners.get(`doc:${type}`)?.delete(callback)
      ),
    });
    const output = await MediaDeviceOutput.create({
      sampleRate: 16000,
      format: "pcm",
      audioContext: context,
    });
    context.resume.mockClear();
    return output;
  }

  // Connect the shipped worklet to the output controller, retaining message
  // delivery control so completion can race with a newly queued buffer.
  function connectProcessor() {
    type WorkletMessage = Record<string, unknown>;
    type Processor = {
      port: { onmessage: (event: { data: WorkletMessage }) => void };
      process(inputs: unknown, outputs: Float32Array[][]): boolean;
    };
    const messages: WorkletMessage[] = [];
    let Processor: (new () => Processor) | undefined;
    class FakeAudioWorkletProcessor {
      port = {
        onmessage: (_event: { data: WorkletMessage }) => {},
        postMessage: (data: WorkletMessage) => messages.push(data),
      };
    }
    new Function(
      "AudioWorkletProcessor",
      "registerProcessor",
      "sampleRate",
      workletSource.current
    )(
      FakeAudioWorkletProcessor,
      (_name: string, cls: new () => Processor) => {
        Processor = cls;
      },
      context.sampleRate
    );
    const processor = new Processor!();
    processor.port.onmessage({
      data: {
        type: "setFormat",
        format: "pcm",
        sampleRate: context.sampleRate,
      },
    });
    worklet.port.postMessage.mockImplementation((data: WorkletMessage) => {
      processor.port.onmessage({ data });
    });
    return {
      render: () => processor.process([], [[new Float32Array(128)]]),
      deliverMessages: () => {
        for (const data of messages.splice(0)) {
          onWorkletMessage?.(new MessageEvent("message", { data }));
        }
      },
    };
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("resumes a suspended context when a chunk arrives", async () => {
    const output = await setup();
    context.state = "suspended";
    output.playAudio(new ArrayBuffer(4));
    await vi.waitFor(() => expect(context.resume).toHaveBeenCalledTimes(1));
    expect(worklet.port.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "buffer" })
    );
    await output.close();
  });

  it("defers recovery while hidden and retries when visible", async () => {
    const output = await setup();
    context.state = "suspended";
    (document as unknown as { visibilityState: string }).visibilityState =
      "hidden";
    output.playAudio(new ArrayBuffer(4));
    expect(context.resume).not.toHaveBeenCalled();
    (document as unknown as { visibilityState: string }).visibilityState =
      "visible";
    listeners.get("doc:visibilitychange")?.forEach(callback => callback());
    await vi.waitFor(() => expect(context.resume).toHaveBeenCalledTimes(1));
    await output.close();
  });

  it("recovers an interrupted context when audio arrives", async () => {
    const output = await setup();
    context.state = "interrupted";
    output.playAudio(new ArrayBuffer(4));
    await vi.waitFor(() => expect(context.resume).toHaveBeenCalledTimes(1));
    await output.close();
  });

  it("defers interrupted recovery until returning to foreground", async () => {
    const output = await setup();
    context.state = "interrupted";
    (document as unknown as { visibilityState: string }).visibilityState =
      "hidden";
    output.playAudio(new ArrayBuffer(4));
    expect(context.resume).not.toHaveBeenCalled();
    (document as unknown as { visibilityState: string }).visibilityState =
      "visible";
    listeners.get("doc:visibilitychange")?.forEach(callback => callback());
    await vi.waitFor(() => expect(context.resume).toHaveBeenCalledTimes(1));
    await output.close();
  });

  it("recovers audio queued while running after suspension before completion", async () => {
    const output = await setup();
    output.playAudio(new ArrayBuffer(4));
    expect(context.resume).not.toHaveBeenCalled();

    context.state = "suspended";
    listeners.get("statechange")?.forEach(callback => callback());
    await vi.waitFor(() => expect(context.resume).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(context.state).toBe("running"));
    // Allow the recovery promise's finally handler to clear its in-flight guard.
    await new Promise(resolve => setTimeout(resolve, 0));

    // A successful resume does not complete queued playback. If the browser
    // suspends again without a new chunk, recovery must still be possible.
    context.state = "interrupted";
    listeners.get("statechange")?.forEach(callback => callback());
    await vi.waitFor(() => expect(context.resume).toHaveBeenCalledTimes(2));

    onWorkletMessage?.(
      new MessageEvent("message", {
        data: { type: "process", finished: true, bufferSequence: 1 },
      })
    );
    context.state = "suspended";
    listeners.get("statechange")?.forEach(callback => callback());
    expect(context.resume).toHaveBeenCalledTimes(2);
    await output.close();
  });

  it("ignores an idle notification from before newer audio was queued", async () => {
    const output = await setup();
    output.playAudio(new ArrayBuffer(4));
    const first = worklet.port.postMessage.mock.calls.find(
      ([message]: [{ type: string }]) => message.type === "buffer"
    )![0];
    expect(first.bufferSequence).toBe(1);
    output.playAudio(new ArrayBuffer(4));
    const buffers = worklet.port.postMessage.mock.calls
      .map(([message]: [{ type: string }]) => message)
      .filter((message: { type: string }) => message.type === "buffer");
    expect(buffers[1].bufferSequence).toBe(2);

    // The worklet finished an earlier queue before it received the new buffer.
    onWorkletMessage?.(
      new MessageEvent("message", {
        data: { type: "process", finished: true, bufferSequence: 1 },
      })
    );
    context.state = "suspended";
    listeners.get("statechange")?.forEach(callback => callback());
    await vi.waitFor(() => expect(context.resume).toHaveBeenCalledTimes(1));

    // Once the latest buffer finishes, recovery is no longer needed.
    onWorkletMessage?.(
      new MessageEvent("message", {
        data: { type: "process", finished: true, bufferSequence: 2 },
      })
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    context.state = "suspended";
    listeners.get("statechange")?.forEach(callback => callback());
    expect(context.resume).toHaveBeenCalledTimes(1);
    await output.close();
  });

  it.each(["suspended", "interrupted"])(
    "does not resume completed short chunks after the context is %s",
    async state => {
      const output = await setup();
      const processor = connectProcessor();
      processor.render();
      processor.deliverMessages();

      for (let i = 0; i < 2; i++) {
        output.playAudio(new Int16Array(64).buffer);
        processor.render();
        processor.deliverMessages();
      }
      context.state = state;
      listeners.get("statechange")?.forEach(callback => callback());
      listeners.get("doc:visibilitychange")?.forEach(callback => callback());
      expect(context.resume).not.toHaveBeenCalled();
      await output.close();
    }
  );

  it("keeps newer audio pending when a short-chunk completion arrives late", async () => {
    const output = await setup();
    const processor = connectProcessor();
    processor.render();
    processor.deliverMessages();

    output.playAudio(new Int16Array(64).buffer);
    processor.render();
    // Queue newer audio before delivering the preceding short completion.
    output.playAudio(new Int16Array(64).buffer);
    processor.deliverMessages();
    context.state = "suspended";
    listeners.get("statechange")?.forEach(callback => callback());
    await vi.waitFor(() => expect(context.resume).toHaveBeenCalledTimes(1));
    await new Promise(resolve => setTimeout(resolve, 0));

    processor.render();
    processor.deliverMessages();
    context.state = "interrupted";
    listeners.get("statechange")?.forEach(callback => callback());
    listeners.get("doc:visibilitychange")?.forEach(callback => callback());
    expect(context.resume).toHaveBeenCalledTimes(1);
    await output.close();
  });

  it("removes listeners and does not resume after close", async () => {
    const output = await setup();
    await output.close();
    context.state = "suspended";
    listeners.get("statechange")?.forEach(callback => callback());
    expect(context.resume).not.toHaveBeenCalled();
    expect(listeners.get("statechange")?.size).toBe(0);
    expect(listeners.get("doc:visibilitychange")?.size).toBe(0);
  });
});
