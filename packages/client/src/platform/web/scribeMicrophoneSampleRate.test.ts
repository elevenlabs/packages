import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./scribeAudioProcessor.generated.js", () => ({
  loadScribeAudioProcessor: vi.fn(),
}));
vi.mock("./addLibsamplerateModule.js", () => ({
  addLibsamplerateModule: vi.fn(),
}));

import { installAudioEnvironment } from "./__tests__/scribeAudioEnvironment.js";
import { addLibsamplerateModule } from "./addLibsamplerateModule.js";
import { loadScribeAudioProcessor } from "./scribeAudioProcessor.generated.js";
import { webScribeMicrophoneSetup } from "./scribeMicrophone.js";

describe("webScribeMicrophoneSetup sample rate", () => {
  afterEach(() => {
    vi.mocked(loadScribeAudioProcessor).mockReset();
    vi.mocked(addLibsamplerateModule).mockReset();
    vi.unstubAllGlobals();
  });

  it.each([16000, 44100, 48000, undefined])(
    "lets the browser resample a %s Hz track when it supports the sampleRate constraint",
    async trackSampleRate => {
      const { AudioContext } = installAudioEnvironment({ trackSampleRate });

      await webScribeMicrophoneSetup({}, vi.fn());

      expect(AudioContext).toHaveBeenCalledWith({ sampleRate: 16000 });
      expect(addLibsamplerateModule).not.toHaveBeenCalled();
    }
  );

  it.each([
    { trackSampleRate: 48000, contextOptions: { sampleRate: 48000 } },
    { trackSampleRate: 44100, contextOptions: { sampleRate: 44100 } },
    { trackSampleRate: undefined, contextOptions: {} },
  ])(
    "resamples a $trackSampleRate Hz track with libsamplerate when the sampleRate constraint is unsupported",
    async ({ trackSampleRate, contextOptions }) => {
      const { AudioContext, scribeNode, source } = installAudioEnvironment({
        supportsSampleRate: false,
        trackSampleRate,
      });

      await webScribeMicrophoneSetup(
        { workletPaths: { libsamplerate: "/vendor/libsamplerate.js" } },
        vi.fn()
      );

      expect(AudioContext).toHaveBeenCalledWith(contextOptions);
      expect(addLibsamplerateModule).toHaveBeenCalledWith(
        expect.anything(),
        "/vendor/libsamplerate.js"
      );
      expect(scribeNode.port.postMessage).toHaveBeenCalledWith({
        type: "configure",
        outputSampleRate: 16000,
      });
      expect(
        scribeNode.port.postMessage.mock.invocationCallOrder[0]
      ).toBeLessThan(source.connect.mock.invocationCallOrder[0]);
    }
  );

  it("skips libsamplerate when an unsupported browser already captures at 16000 Hz", async () => {
    installAudioEnvironment({
      supportsSampleRate: false,
      trackSampleRate: 16000,
    });

    await webScribeMicrophoneSetup({}, vi.fn());

    expect(addLibsamplerateModule).not.toHaveBeenCalled();
  });

  it("fails and releases the pipeline when the resampler cannot be created", async () => {
    const { audioContext, source, track } = installAudioEnvironment({
      supportsSampleRate: false,
      trackSampleRate: 48000,
      resamplerError: "libsamplerate is not loaded",
    });

    await expect(webScribeMicrophoneSetup({}, vi.fn())).rejects.toThrow(
      "Failed to create audio resampler: libsamplerate is not loaded"
    );

    expect(source.connect).not.toHaveBeenCalled();
    expect(track.stop).toHaveBeenCalledOnce();
    expect(audioContext.close).toHaveBeenCalledOnce();
  });
});
