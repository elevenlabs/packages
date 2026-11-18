import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./rawAudioProcessor.generated.js", () => ({
  loadRawAudioProcessor: vi.fn(),
}));

vi.mock("./compatibility.js", () => ({
  isIosDevice: () => false,
}));

import { MediaDeviceInput } from "./input.js";
import { loadRawAudioProcessor } from "./rawAudioProcessor.generated.js";

const INPUT = { format: "pcm" as const, sampleRate: 16000 };

function installInputEnvironment() {
  const track = {
    stop: vi.fn(),
    getSettings: vi.fn(() => ({ deviceId: "mic-1", sampleRate: 16000 })),
  };
  const stream = {
    getTracks: vi.fn(() => [track]),
    getAudioTracks: vi.fn(() => [track]),
  };
  const source = { connect: vi.fn(), disconnect: vi.fn() };
  const analyser = {
    frequencyBinCount: 32,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn(),
  };
  const port = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    postMessage: vi.fn(),
    start: vi.fn(),
    close: vi.fn(),
  };
  const worklet = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    port,
  };
  const permissions = {
    state: "granted" as PermissionState,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  const audioContext = {
    sampleRate: INPUT.sampleRate,
    state: "running" as AudioContextState,
    close: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    createAnalyser: vi.fn(() => analyser),
    createMediaStreamSource: vi.fn(() => source),
    audioWorklet: {},
  };

  vi.stubGlobal("navigator", {
    mediaDevices: {
      getSupportedConstraints: vi.fn(() => ({ sampleRate: true })),
      getUserMedia: vi.fn().mockResolvedValue(stream),
    },
    permissions: {
      query: vi.fn().mockResolvedValue(permissions),
    },
  });
  vi.stubGlobal("window", {
    AudioContext: vi.fn(function MockAudioContext() {
      return audioContext;
    }),
  });
  vi.mocked(loadRawAudioProcessor).mockResolvedValue(
    worklet as unknown as AudioWorkletNode
  );

  return { analyser, audioContext, permissions, port, source, track, worklet };
}

function lastCallOrder(mock: { mock: { invocationCallOrder: number[] } }) {
  const order = mock.mock.invocationCallOrder;
  return order[order.length - 1] ?? -1;
}

describe("MediaDeviceInput.close", () => {
  afterEach(() => {
    vi.mocked(loadRawAudioProcessor).mockReset();
    vi.unstubAllGlobals();
  });

  it("closes the worklet port and disconnects the worklet while stopping the mic", async () => {
    const env = installInputEnvironment();
    const input = await MediaDeviceInput.create(INPUT);
    const listener = vi.fn();
    input.addListener(listener);

    await input.close();

    expect(env.track.stop).toHaveBeenCalledOnce();
    expect(env.source.disconnect).toHaveBeenCalledOnce();
    expect(env.permissions.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    );
    expect(env.worklet.disconnect).toHaveBeenCalledOnce();
    expect(env.analyser.disconnect).toHaveBeenCalledOnce();
    expect(env.port.close).toHaveBeenCalledOnce();
    expect(env.port.removeEventListener).not.toHaveBeenCalled();
    expect(env.audioContext.close).toHaveBeenCalledOnce();

    const sequence = [
      env.track.stop,
      env.source.disconnect,
      env.permissions.removeEventListener,
      env.worklet.disconnect,
      env.analyser.disconnect,
      env.port.close,
      env.audioContext.close,
    ].map(mock => lastCallOrder(mock));
    expect(sequence).toEqual([...sequence].sort((a, b) => a - b));
  });

  it("still closes the port and context when the worklet is already disconnected", async () => {
    const env = installInputEnvironment();
    const input = await MediaDeviceInput.create(INPUT);
    env.worklet.disconnect.mockImplementation(() => {
      throw new DOMException("node is not connected", "InvalidAccessError");
    });
    env.analyser.disconnect.mockImplementation(() => {
      throw new DOMException("node is not connected", "InvalidAccessError");
    });

    await input.close();

    expect(env.track.stop).toHaveBeenCalledOnce();
    expect(env.port.close).toHaveBeenCalledOnce();
    expect(env.audioContext.close).toHaveBeenCalledOnce();
  });

  it("does not swallow an unexpected disconnect failure", async () => {
    const env = installInputEnvironment();
    const input = await MediaDeviceInput.create(INPUT);
    env.worklet.disconnect.mockImplementation(() => {
      throw new Error("disconnect failed");
    });

    await expect(input.close()).rejects.toThrow("disconnect failed");
    expect(env.track.stop).toHaveBeenCalledOnce();
    expect(env.port.close).not.toHaveBeenCalled();
    expect(env.audioContext.close).not.toHaveBeenCalled();
  });

  it("propagates a failure from AudioContext.close", async () => {
    const env = installInputEnvironment();
    const input = await MediaDeviceInput.create(INPUT);
    const closeError = new DOMException(
      "Context is closed",
      "InvalidStateError"
    );
    env.audioContext.close.mockRejectedValueOnce(closeError);

    await expect(input.close()).rejects.toBe(closeError);
    expect(env.track.stop).toHaveBeenCalledOnce();
    expect(env.port.close).toHaveBeenCalledOnce();
  });
});
