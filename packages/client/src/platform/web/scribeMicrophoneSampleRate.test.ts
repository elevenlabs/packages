import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./scribeAudioProcessor.generated.js", () => ({
  loadScribeAudioProcessor: vi.fn(),
}));

import { installAudioEnvironment } from "./__tests__/scribeAudioEnvironment.js";
import { loadScribeAudioProcessor } from "./scribeAudioProcessor.generated.js";
import { webScribeMicrophoneSetup } from "./scribeMicrophone.js";

describe("webScribeMicrophoneSetup sample rate", () => {
  afterEach(() => {
    vi.mocked(loadScribeAudioProcessor).mockReset();
    vi.unstubAllGlobals();
  });

  it.each([16000, 44100, 48000, undefined])(
    "lets the browser resample a %s Hz track when it supports the sampleRate constraint",
    async trackSampleRate => {
      const { AudioContext, scribeNode } = installAudioEnvironment({
        trackSampleRate,
      });

      await webScribeMicrophoneSetup({}, vi.fn());

      expect(AudioContext).toHaveBeenCalledWith({ sampleRate: 16000 });
      expect(scribeNode.port.postMessage).not.toHaveBeenCalled();
    }
  );

  it.each([
    { trackSampleRate: 48000, contextOptions: { sampleRate: 48000 } },
    { trackSampleRate: 44100, contextOptions: { sampleRate: 44100 } },
  ])(
    "keeps a $trackSampleRate Hz track rate and resamples in the worklet when the sampleRate constraint is unsupported",
    async ({ trackSampleRate, contextOptions }) => {
      const { AudioContext, scribeNode } = installAudioEnvironment({
        supportsSampleRate: false,
        trackSampleRate,
      });

      await webScribeMicrophoneSetup({}, vi.fn());

      expect(AudioContext).toHaveBeenCalledWith(contextOptions);
      expect(scribeNode.port.postMessage).toHaveBeenCalledWith({
        type: "configure",
        inputSampleRate: trackSampleRate,
        outputSampleRate: 16000,
      });
    }
  );

  it("uses the default AudioContext rate when an unsupported browser reports no track rate", async () => {
    const { AudioContext } = installAudioEnvironment({
      supportsSampleRate: false,
    });

    await webScribeMicrophoneSetup({}, vi.fn());

    expect(AudioContext).toHaveBeenCalledWith({});
  });

  it("skips resampling when an unsupported browser already captures at 16000 Hz", async () => {
    const { scribeNode } = installAudioEnvironment({
      supportsSampleRate: false,
      trackSampleRate: 16000,
    });

    await webScribeMicrophoneSetup({}, vi.fn());

    expect(scribeNode.port.postMessage).not.toHaveBeenCalled();
  });
});
