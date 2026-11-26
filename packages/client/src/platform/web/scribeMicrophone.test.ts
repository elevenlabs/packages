import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./scribeAudioProcessor.generated.js", () => ({
  loadScribeAudioProcessor: vi.fn(),
}));

import { installAudioEnvironment } from "./__tests__/scribeAudioEnvironment.js";
import { loadScribeAudioProcessor } from "./scribeAudioProcessor.generated.js";
import { webScribeMicrophoneSetup } from "./scribeMicrophone.js";

describe("webScribeMicrophoneSetup", () => {
  afterEach(() => {
    vi.mocked(loadScribeAudioProcessor).mockReset();
    vi.unstubAllGlobals();
  });

  it("retains the successful setup cleanup behavior", async () => {
    const { audioContext, scribeNode, source, track } =
      installAudioEnvironment();

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

    await expect(webScribeMicrophoneSetup({}, vi.fn())).rejects.toThrow(
      resumeError
    );

    expect(track.stop).toHaveBeenCalledOnce();
    expect(source.disconnect).toHaveBeenCalledOnce();
    expect(scribeNode.disconnect).toHaveBeenCalledOnce();
    expect(audioContext.close).toHaveBeenCalledOnce();
  });
});
