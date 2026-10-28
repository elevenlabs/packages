import { afterEach, describe, expect, it, vi } from "vitest";
import { MediaDeviceOutput } from "./output.js";

const { loadWorklet } = vi.hoisted(() => ({ loadWorklet: vi.fn() }));
vi.mock("./audioConcatProcessor.generated.js", () => ({
  loadAudioConcatProcessor: loadWorklet,
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
