import { type Mock, vi } from "vitest";

import { loadScribeAudioProcessor } from "../scribeAudioProcessor.generated.js";

const fn: <T extends (...args: never[]) => unknown>(impl?: T) => Mock<T> =
  vi.fn;

const DEFAULT_CONTEXT_SAMPLE_RATE = 48000;

export function installAudioEnvironment(options?: {
  state?: "running" | "suspended";
  resumeError?: Error;
  supportsSampleRate?: boolean;
  trackSampleRate?: number;
}) {
  const track = {
    getSettings: fn(() => ({ sampleRate: options?.trackSampleRate })),
    stop: fn(),
  };
  const stream = {
    getAudioTracks: fn(() => [track]),
    getTracks: fn(() => [track]),
  };
  const source = {
    connect: fn(),
    disconnect: fn(),
  };
  const scribeNode = {
    disconnect: fn(),
    port: {
      onmessage: null,
      postMessage: fn(),
    },
  };
  const audioContext = {
    audioWorklet: {},
    close: fn().mockResolvedValue(undefined),
    createMediaStreamSource: fn(() => source),
    resume: options?.resumeError
      ? fn().mockRejectedValue(options.resumeError)
      : fn().mockResolvedValue(undefined),
    sampleRate: 16000,
    state: options?.state ?? "running",
  };
  const AudioContext = fn(function MockAudioContext(
    contextOptions: AudioContextOptions
  ) {
    audioContext.sampleRate =
      contextOptions.sampleRate ?? DEFAULT_CONTEXT_SAMPLE_RATE;
    return audioContext;
  });

  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: fn().mockResolvedValue(stream),
      getSupportedConstraints: () => ({
        sampleRate: options?.supportsSampleRate ?? true,
      }),
    },
  });
  vi.stubGlobal("AudioContext", AudioContext);

  vi.mocked(loadScribeAudioProcessor).mockResolvedValue(
    scribeNode as unknown as AudioWorkletNode
  );

  return { AudioContext, audioContext, scribeNode, source, track };
}
