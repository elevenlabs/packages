import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./scribeAudioProcessor.generated.js", () => ({
  loadScribeAudioProcessor: vi.fn(),
}));

import { loadScribeAudioProcessor } from "./scribeAudioProcessor.generated.js";
import { webScribeMicrophoneSetup } from "./scribeMicrophone.js";

function installAudioEnvironment(options?: {
  state?: "running" | "suspended";
  resumeError?: Error;
}) {
  const track = {
    getSettings: vi.fn(() => ({ sampleRate: 16000 })),
    stop: vi.fn(),
  };
  const stream = {
    getAudioTracks: vi.fn(() => [track]),
    getTracks: vi.fn(() => [track]),
  };
  const source = {
    connect: vi.fn(),
    disconnect: vi.fn(),
  };
  const scribeNode = {
    disconnect: vi.fn(),
    port: {
      onmessage: null,
      postMessage: vi.fn(),
    },
  };
  const audioContext = {
    audioWorklet: {},
    close: vi.fn().mockResolvedValue(undefined),
    createMediaStreamSource: vi.fn(() => source),
    resume: options?.resumeError
      ? vi.fn().mockRejectedValue(options.resumeError)
      : vi.fn().mockResolvedValue(undefined),
    sampleRate: 16000,
    state: options?.state ?? "running",
  };

  vi.stubGlobal("navigator", {
    mediaDevices: { getUserMedia: vi.fn().mockResolvedValue(stream) },
  });
  vi.stubGlobal(
    "AudioContext",
    vi.fn(function MockAudioContext() {
      return audioContext;
    })
  );
  vi.stubGlobal(
    "AudioWorkletNode",
    vi.fn(function MockAudioWorkletNode() {
      return scribeNode;
    })
  );

  return { audioContext, scribeNode, source, track };
}

describe("webScribeMicrophoneSetup", () => {
  afterEach(() => {
    vi.mocked(loadScribeAudioProcessor).mockReset();
    vi.unstubAllGlobals();
  });

  it("retains the successful setup cleanup behavior", async () => {
    const { audioContext, scribeNode, source, track } =
      installAudioEnvironment();
    vi.mocked(loadScribeAudioProcessor).mockResolvedValueOnce(undefined);

    const result = await webScribeMicrophoneSetup({}, vi.fn());
    result.cleanup();

    expect(result.mediaStreamTrack).toBe(track);
    expect(source.connect).toHaveBeenCalledWith(scribeNode);
    expect(track.stop).toHaveBeenCalledOnce();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(scribeNode.disconnect).toHaveBeenCalledOnce();
    expect(audioContext.close).toHaveBeenCalledOnce();
  });

  it("releases the stream and AudioContext when worklet loading fails", async () => {
    const { audioContext, track } = installAudioEnvironment();
    const workletError = new Error("worklet blocked");
    vi.mocked(loadScribeAudioProcessor).mockRejectedValueOnce(workletError);

    await expect(webScribeMicrophoneSetup({}, vi.fn())).rejects.toThrow(
      workletError
    );

    expect(track.stop).toHaveBeenCalledOnce();
    expect(audioContext.close).toHaveBeenCalledOnce();
  });

  it("releases the partial pipeline when AudioContext resume fails", async () => {
    const resumeError = new Error("resume failed");
    const { audioContext, scribeNode, source, track } = installAudioEnvironment(
      { state: "suspended", resumeError }
    );
    vi.mocked(loadScribeAudioProcessor).mockResolvedValueOnce(undefined);

    await expect(webScribeMicrophoneSetup({}, vi.fn())).rejects.toThrow(
      resumeError
    );

    expect(track.stop).toHaveBeenCalledOnce();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(scribeNode.disconnect).toHaveBeenCalledOnce();
    expect(audioContext.close).toHaveBeenCalledOnce();
  });
});
