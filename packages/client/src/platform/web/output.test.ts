import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./audioConcatProcessor.generated.js", () => ({
  loadAudioConcatProcessor: vi.fn(),
}));

vi.mock("./compatibility.js", () => ({
  isIosDevice: () => false,
}));

import { loadAudioConcatProcessor } from "./audioConcatProcessor.generated.js";
import { MediaDeviceOutput } from "./output.js";

const OUTPUT = { format: "pcm" as const, sampleRate: 16000 };

class FakeMediaStream {
  constructor(private readonly tracks: { stop: ReturnType<typeof vi.fn> }[]) {}

  getTracks() {
    return this.tracks;
  }
}

class FakeAudio {
  src = "";
  autoplay = false;
  style = { display: "" };
  parentNode: { removeChild: (child: FakeAudio) => void } | null = null;
  private currentSrcObject: unknown = null;
  load = vi.fn();
  pause = vi.fn();
  play = vi.fn().mockResolvedValue(undefined);
  setSinkId = vi.fn().mockResolvedValue(undefined);

  get srcObject() {
    return this.currentSrcObject;
  }

  set srcObject(value: unknown) {
    this.currentSrcObject = value;
    this.onSrcObject?.(value);
  }

  onSrcObject?: (value: unknown) => void;
}

function installOutputEnvironment() {
  const track = { stop: vi.fn() };
  const setSrcObject = vi.fn();
  const audios: FakeAudio[] = [];

  vi.stubGlobal("MediaStream", FakeMediaStream);
  const stream = new FakeMediaStream([track]);

  const removeChild = vi.fn((element: FakeAudio) => {
    element.parentNode = null;
  });

  class RecordingAudio extends FakeAudio {
    constructor() {
      super();
      this.onSrcObject = setSrcObject;
      audios.push(this);
    }
  }

  vi.stubGlobal("Audio", RecordingAudio);
  vi.stubGlobal("document", {
    body: {
      appendChild: (element: FakeAudio) => {
        element.parentNode = { removeChild };
      },
    },
  });

  const gain = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    gain: {
      value: 1,
      cancelScheduledValues: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  };
  const analyser = {
    frequencyBinCount: 32,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn(),
  };
  const port = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
    postMessage: vi.fn(),
  };
  const worklet = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    port,
  };
  const audioContext = {
    sampleRate: OUTPUT.sampleRate,
    state: "running" as AudioContextState,
    close: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    createAnalyser: vi.fn(() => analyser),
    createGain: vi.fn(() => gain),
    createMediaStreamDestination: vi.fn(() => ({ stream })),
    currentTime: 0,
  };

  const AudioContextMock = vi.fn(function MockAudioContext() {
    return audioContext;
  });
  vi.stubGlobal("AudioContext", AudioContextMock);
  vi.mocked(loadAudioConcatProcessor).mockResolvedValue(
    worklet as unknown as AudioWorkletNode
  );

  return {
    AudioContextMock,
    analyser,
    audioContext,
    audios,
    gain,
    port,
    removeChild,
    setSrcObject,
    track,
    worklet,
  };
}

function lastCallOrder(mock: { mock: { invocationCallOrder: number[] } }) {
  const order = mock.mock.invocationCallOrder;
  return order[order.length - 1] ?? -1;
}

describe("MediaDeviceOutput.close", () => {
  afterEach(() => {
    vi.mocked(loadAudioConcatProcessor).mockReset();
    vi.unstubAllGlobals();
  });

  it("releases the worklet port and audio element, then closes the context", async () => {
    const env = installOutputEnvironment();
    const output = await MediaDeviceOutput.create(OUTPUT);
    const audio = env.audios[0];
    expect(audio).toBeDefined();
    const listener = vi.fn();
    output.addListener(listener);
    const handler = env.port.addEventListener.mock.calls[0]?.[1] as
      | ((event: { data: { type: "process"; finished: boolean } }) => void)
      | undefined;

    await output.close();

    expect(env.port.removeEventListener).toHaveBeenCalledWith(
      "message",
      handler
    );
    expect(env.port.close).toHaveBeenCalledOnce();
    expect(env.worklet.disconnect).toHaveBeenCalledOnce();
    expect(env.gain.disconnect).toHaveBeenCalledOnce();
    expect(env.analyser.disconnect).toHaveBeenCalledOnce();
    expect(env.track.stop).toHaveBeenCalledOnce();
    expect(env.setSrcObject).toHaveBeenLastCalledWith(null);
    expect(audio?.srcObject).toBeNull();
    expect(env.removeChild).toHaveBeenCalledWith(audio);
    expect(audio?.pause).toHaveBeenCalledOnce();
    expect(env.audioContext.close).toHaveBeenCalledOnce();

    const sequence = [
      env.port.removeEventListener,
      env.port.close,
      env.worklet.disconnect,
      env.track.stop,
      env.setSrcObject,
      env.gain.disconnect,
      env.analyser.disconnect,
      env.removeChild,
      audio?.pause,
      env.audioContext.close,
    ].map(mock => lastCallOrder(mock!));
    expect(sequence).toEqual([...sequence].sort((a, b) => a - b));

    handler?.({ data: { type: "process", finished: true } });
    expect(listener).not.toHaveBeenCalled();
  });

  it("still closes the context when nodes are already disconnected", async () => {
    const env = installOutputEnvironment();
    const output = await MediaDeviceOutput.create(OUTPUT);
    const disconnected = new DOMException(
      "node is not connected",
      "InvalidAccessError"
    );
    env.worklet.disconnect.mockImplementation(() => {
      throw disconnected;
    });
    env.gain.disconnect.mockImplementation(() => {
      throw disconnected;
    });
    env.analyser.disconnect.mockImplementation(() => {
      throw disconnected;
    });

    await output.close();

    expect(env.track.stop).toHaveBeenCalledOnce();
    expect(env.audios[0]?.srcObject).toBeNull();
    expect(env.audios[0]?.pause).toHaveBeenCalledOnce();
    expect(env.audioContext.close).toHaveBeenCalledOnce();
  });

  it("does not swallow an unexpected disconnect failure", async () => {
    const env = installOutputEnvironment();
    const output = await MediaDeviceOutput.create(OUTPUT);
    env.worklet.disconnect.mockImplementation(() => {
      throw new Error("disconnect failed");
    });

    await expect(output.close()).rejects.toThrow("disconnect failed");
    expect(env.audioContext.close).not.toHaveBeenCalled();
  });

  it("propagates a failure from AudioContext.close", async () => {
    const env = installOutputEnvironment();
    const output = await MediaDeviceOutput.create(OUTPUT);
    const closeError = new DOMException(
      "Context is closed",
      "InvalidStateError"
    );
    env.audioContext.close.mockRejectedValueOnce(closeError);

    await expect(output.close()).rejects.toBe(closeError);
    expect(env.track.stop).toHaveBeenCalledOnce();
    expect(env.audios[0]?.srcObject).toBeNull();
    expect(env.audios[0]?.pause).toHaveBeenCalledOnce();
  });

  it("closes an AudioContext that was passed to create", async () => {
    const env = installOutputEnvironment();
    const output = await MediaDeviceOutput.create({
      ...OUTPUT,
      audioContext: env.audioContext as unknown as AudioContext,
    });

    expect(env.AudioContextMock).not.toHaveBeenCalled();
    await output.close();
    expect(env.audioContext.close).toHaveBeenCalledOnce();
  });

  it("releases srcObject when setup fails after the element is attached", async () => {
    const env = installOutputEnvironment();
    const workletError = new Error("worklet failed");
    vi.mocked(loadAudioConcatProcessor).mockRejectedValueOnce(workletError);

    await expect(MediaDeviceOutput.create(OUTPUT)).rejects.toBe(workletError);

    expect(env.track.stop).toHaveBeenCalledOnce();
    expect(env.setSrcObject).toHaveBeenLastCalledWith(null);
    expect(env.audios[0]?.srcObject).toBeNull();
    expect(env.removeChild).toHaveBeenCalledOnce();
    expect(env.audios[0]?.pause).toHaveBeenCalledOnce();
    expect(env.audioContext.close).toHaveBeenCalledOnce();
    expect(env.port.close).not.toHaveBeenCalled();
  });
});
