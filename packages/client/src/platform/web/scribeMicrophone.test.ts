import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./scribeAudioProcessor.generated.js", () => ({
  loadScribeAudioProcessor: vi.fn(),
}));

import { loadScribeAudioProcessor } from "./scribeAudioProcessor.generated.js";
import { webScribeMicrophoneSetup } from "./scribeMicrophone.js";
import type { MicrophoneOptions } from "../../scribe/scribe.js";

// Type-level pin. `MicrophoneOptions["microphone"]` is a structural copy of
// ScribeMicrophoneConfig rather than a reference to it, so a field added to the
// config alone stays unreachable through Scribe.connect and useScribe. Excess
// property checking on this literal fails the build if the two drift again.
const _setupTimeoutIsPubliclySettable: MicrophoneOptions["microphone"] = {
  setupTimeoutMs: 250,
};
void _setupTimeoutIsPubliclySettable;

function installAudioEnvironment(options?: {
  state?: "running" | "suspended";
  resumeError?: Error;
  /** Mimics WebKit's resume() that neither resolves nor rejects. */
  resumeHangs?: boolean;
  /** How long getUserMedia takes, standing in for the permission prompt. */
  getUserMediaDelayMs?: number;
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
      : options?.resumeHangs
        ? vi.fn(() => new Promise<void>(() => {}))
        : vi.fn().mockResolvedValue(undefined),
    sampleRate: 16000,
    state: options?.state ?? "running",
  };

  const getUserMediaDelayMs = options?.getUserMediaDelayMs;
  vi.stubGlobal("navigator", {
    mediaDevices: {
      getUserMedia: getUserMediaDelayMs
        ? vi.fn(
            () =>
              new Promise(resolve =>
                setTimeout(() => resolve(stream), getUserMediaDelayMs)
              )
          )
        : vi.fn().mockResolvedValue(stream),
    },
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

  it("forwards a custom workletPaths.scribeAudioProcessor to the loader", async () => {
    installAudioEnvironment();
    vi.mocked(loadScribeAudioProcessor).mockResolvedValueOnce(undefined);

    await webScribeMicrophoneSetup(
      { workletPaths: { scribeAudioProcessor: "/vendor/scribe-processor.js" } },
      vi.fn()
    );

    expect(loadScribeAudioProcessor).toHaveBeenCalledWith(
      expect.anything(),
      "/vendor/scribe-processor.js"
    );
  });

  it("passes undefined to the loader when no workletPaths are provided", async () => {
    installAudioEnvironment();
    vi.mocked(loadScribeAudioProcessor).mockResolvedValueOnce(undefined);

    await webScribeMicrophoneSetup({}, vi.fn());

    expect(loadScribeAudioProcessor).toHaveBeenCalledWith(
      expect.anything(),
      undefined
    );
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

  it("rejects and releases the microphone when resume never settles", async () => {
    vi.useFakeTimers();
    try {
      const { audioContext, scribeNode, source, track } =
        installAudioEnvironment({ state: "suspended", resumeHangs: true });
      vi.mocked(loadScribeAudioProcessor).mockResolvedValueOnce(undefined);

      const setup = webScribeMicrophoneSetup({}, vi.fn());
      const rejects = expect(setup).rejects.toThrow(
        /Microphone setup timed out after 10000ms/
      );
      await vi.advanceTimersByTimeAsync(10_000);
      await rejects;

      // The point of the fix: the hardware is handed back. Without a bound the
      // caller never receives `cleanup`, so nothing can stop these tracks.
      expect(track.stop).toHaveBeenCalledOnce();
      expect(source.disconnect).toHaveBeenCalledOnce();
      expect(scribeNode.disconnect).toHaveBeenCalledOnce();
      expect(audioContext.close).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it("honors a custom setupTimeoutMs", async () => {
    vi.useFakeTimers();
    try {
      const { track } = installAudioEnvironment({
        state: "suspended",
        resumeHangs: true,
      });
      vi.mocked(loadScribeAudioProcessor).mockResolvedValueOnce(undefined);

      const setup = webScribeMicrophoneSetup({ setupTimeoutMs: 250 }, vi.fn());
      const rejects = expect(setup).rejects.toThrow(
        /Microphone setup timed out after 250ms/
      );
      await vi.advanceTimersByTimeAsync(250);
      await rejects;

      expect(track.stop).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  // Scope control. The timeout must not cover getUserMedia, because that is
  // where the user is answering the browser's permission prompt. Bounding the
  // whole of setup would abort ordinary first-run sessions.
  it("does not time out while the permission prompt is open", async () => {
    vi.useFakeTimers();
    try {
      const { track } = installAudioEnvironment({
        getUserMediaDelayMs: 60_000,
      });
      vi.mocked(loadScribeAudioProcessor).mockResolvedValueOnce(undefined);

      const setup = webScribeMicrophoneSetup({ setupTimeoutMs: 1000 }, vi.fn());
      await vi.advanceTimersByTimeAsync(60_000);

      await expect(setup).resolves.toMatchObject({ mediaStreamTrack: track });
      expect(track.stop).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("waits indefinitely when setupTimeoutMs is 0", async () => {
    vi.useFakeTimers();
    try {
      installAudioEnvironment({ state: "suspended", resumeHangs: true });
      vi.mocked(loadScribeAudioProcessor).mockResolvedValueOnce(undefined);

      let settled = false;
      const setup = webScribeMicrophoneSetup(
        { setupTimeoutMs: 0 },
        vi.fn()
      ).then(
        () => (settled = true),
        () => (settled = true)
      );
      await vi.advanceTimersByTimeAsync(60_000);

      expect(settled).toBe(false);
      void setup;
    } finally {
      vi.useRealTimers();
    }
  });
});
