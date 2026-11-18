import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./rawAudioProcessor.generated.js", () => ({
  loadRawAudioProcessor: vi.fn(),
}));

import type { RemoteAudioTrack } from "livekit-client";
import type { FormatConfig } from "../../utils/BaseConnection.js";
import { loadRawAudioProcessor } from "./rawAudioProcessor.generated.js";
import { WebAudioAdapter } from "./webAudioAdapter.js";

const OUTPUT_FORMAT: FormatConfig = { format: "pcm", sampleRate: 48000 };

function createWorklet() {
  return {
    disconnect: vi.fn(),
    port: {
      onmessage: null as unknown,
      postMessage: vi.fn(),
      close: vi.fn(),
    },
  };
}

function installAudioEnvironment() {
  const analyser = {
    fftSize: 0,
    smoothingTimeConstant: 0,
    frequencyBinCount: 1024,
    connect: vi.fn(),
    getByteFrequencyData: vi.fn(),
  };
  const source = { connect: vi.fn() };
  const worklet = createWorklet();
  const audioContext = {
    audioWorklet: {},
    close: vi.fn().mockResolvedValue(undefined),
    createAnalyser: vi.fn(() => analyser),
    createMediaStreamSource: vi.fn(() => source),
    sampleRate: 48000,
  };

  vi.stubGlobal(
    "AudioContext",
    vi.fn(function MockAudioContext() {
      return audioContext;
    })
  );
  vi.stubGlobal(
    "MediaStream",
    vi.fn(function MockMediaStream() {
      return {};
    })
  );

  vi.mocked(loadRawAudioProcessor).mockResolvedValue(
    worklet as unknown as AudioWorkletNode
  );

  return { analyser, audioContext, source, worklet };
}

const track = { mediaStreamTrack: {} } as unknown as RemoteAudioTrack;

describe("WebAudioAdapter.setupOutputAnalysis", () => {
  afterEach(() => {
    vi.mocked(loadRawAudioProcessor).mockReset();
    vi.unstubAllGlobals();
  });

  it("forwards a custom workletPaths.rawAudioProcessor to the loader", async () => {
    installAudioEnvironment();

    await new WebAudioAdapter().setupOutputAnalysis(
      track,
      OUTPUT_FORMAT,
      vi.fn(),
      { rawAudioProcessor: "/vendor/raw-audio-processor.js" }
    );

    expect(loadRawAudioProcessor).toHaveBeenCalledWith(
      expect.anything(),
      "/vendor/raw-audio-processor.js"
    );
  });

  it("passes undefined to the loader when no workletPaths are provided", async () => {
    installAudioEnvironment();

    await new WebAudioAdapter().setupOutputAnalysis(
      track,
      OUTPUT_FORMAT,
      vi.fn()
    );

    expect(loadRawAudioProcessor).toHaveBeenCalledWith(
      expect.anything(),
      undefined
    );
  });

  it("passes undefined when workletPaths carries only unrelated processors", async () => {
    installAudioEnvironment();

    await new WebAudioAdapter().setupOutputAnalysis(
      track,
      OUTPUT_FORMAT,
      vi.fn(),
      { audioConcatProcessor: "/vendor/audio-concat-processor.js" }
    );

    expect(loadRawAudioProcessor).toHaveBeenCalledWith(
      expect.anything(),
      undefined
    );
  });

  it("still wires the capture graph when a custom worklet path is used", async () => {
    const { analyser, source, worklet } = installAudioEnvironment();

    const result = await new WebAudioAdapter().setupOutputAnalysis(
      track,
      OUTPUT_FORMAT,
      vi.fn(),
      { rawAudioProcessor: "/vendor/raw-audio-processor.js" }
    );

    expect(source.connect).toHaveBeenCalledWith(analyser);
    expect(analyser.connect).toHaveBeenCalledWith(worklet);
    expect(worklet.port.postMessage).toHaveBeenCalledWith({
      type: "setFormat",
      format: OUTPUT_FORMAT.format,
      sampleRate: OUTPUT_FORMAT.sampleRate,
    });
    expect(result.analyser).toBe(analyser);
  });
});

describe("WebAudioAdapter.attachRemoteTrack", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("applies a volume set before the track arrived", async () => {
    vi.stubGlobal("document", { body: { appendChild: vi.fn() } });
    const adapter = new WebAudioAdapter();
    const audioElement = { volume: 1, style: {} };
    const remoteTrack = {
      attach: () => audioElement,
    } as unknown as RemoteAudioTrack;

    adapter.setVolume(0.25);
    await adapter.attachRemoteTrack(remoteTrack, null);

    expect(audioElement.volume).toBe(0.25);
  });
});

describe("WebAudioAdapter.cleanup", () => {
  afterEach(() => {
    vi.mocked(loadRawAudioProcessor).mockReset();
    vi.unstubAllGlobals();
  });

  it("closes the capture worklet port so it stops holding onAudioData", async () => {
    const { worklet } = installAudioEnvironment();
    const adapter = new WebAudioAdapter();
    await adapter.setupOutputAnalysis(track, OUTPUT_FORMAT, vi.fn());

    adapter.cleanup();
    adapter.cleanup();

    expect(worklet.port.onmessage).toBeNull();
    expect(worklet.port.close).toHaveBeenCalledTimes(1);
    expect(worklet.disconnect).toHaveBeenCalledTimes(1);
  });

  it("is safe before any capture was set up", () => {
    expect(() => new WebAudioAdapter().cleanup()).not.toThrow();
  });

  it("releases the previous worklet when capture moves to a new track", async () => {
    const { worklet: first } = installAudioEnvironment();
    const second = createWorklet();
    vi.mocked(loadRawAudioProcessor)
      .mockResolvedValueOnce(first as unknown as AudioWorkletNode)
      .mockResolvedValueOnce(second as unknown as AudioWorkletNode);
    const adapter = new WebAudioAdapter();

    await adapter.setupOutputAnalysis(track, OUTPUT_FORMAT, vi.fn());
    await adapter.setupOutputAnalysis(track, OUTPUT_FORMAT, vi.fn());

    expect(first.port.onmessage).toBeNull();
    expect(first.port.close).toHaveBeenCalledTimes(1);
    expect(second.port.onmessage).toBeTypeOf("function");
    expect(second.port.close).not.toHaveBeenCalled();
  });

  it("closes a worklet that finishes loading after cleanup", async () => {
    const { worklet } = installAudioEnvironment();
    const adapter = new WebAudioAdapter();

    const pending = adapter.setupOutputAnalysis(track, OUTPUT_FORMAT, vi.fn());
    adapter.cleanup();
    await pending;

    expect(worklet.port.onmessage).toBeNull();
    expect(worklet.port.close).toHaveBeenCalledTimes(1);
  });
});
