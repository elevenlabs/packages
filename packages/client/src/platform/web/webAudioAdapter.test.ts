import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./rawAudioProcessor.generated.js", () => ({
  loadRawAudioProcessor: vi.fn(),
}));

import type { RemoteAudioTrack } from "livekit-client";
import type { FormatConfig } from "../../utils/BaseConnection.js";
import { loadRawAudioProcessor } from "./rawAudioProcessor.generated.js";
import { WebAudioAdapter } from "./webAudioAdapter.js";

const OUTPUT_FORMAT: FormatConfig = { format: "pcm", sampleRate: 48000 };

function installAudioEnvironment() {
  const analyser = {
    fftSize: 0,
    smoothingTimeConstant: 0,
    frequencyBinCount: 1024,
    connect: vi.fn(),
    getByteFrequencyData: vi.fn(),
  };
  const source = { connect: vi.fn() };
  const worklet = {
    port: {
      onmessage: null,
      postMessage: vi.fn(),
    },
  };
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
  vi.stubGlobal(
    "AudioWorkletNode",
    vi.fn(function MockAudioWorkletNode() {
      return worklet;
    })
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
    vi.mocked(loadRawAudioProcessor).mockResolvedValueOnce(undefined);

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
    vi.mocked(loadRawAudioProcessor).mockResolvedValueOnce(undefined);

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
    vi.mocked(loadRawAudioProcessor).mockResolvedValueOnce(undefined);

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
    vi.mocked(loadRawAudioProcessor).mockResolvedValueOnce(undefined);

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
