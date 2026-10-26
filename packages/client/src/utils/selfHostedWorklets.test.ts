import { afterEach, describe, expect, it, vi } from "vitest";
import type { InputMessageEvent } from "../InputController.js";
import { MediaDeviceInput } from "../platform/web/input.js";

// Served by the Vitest dev server straight from the package's published
// `worklets/` directory, as a self-hosting app would serve its copy.
const PUBLISHED_WORKLET = "/worklets/rawAudioProcessor.js";

async function staleWorkletUrl() {
  const source = await (await fetch(PUBLISHED_WORKLET)).text();
  const stale = source.replace(
    /registerProcessor\("rawAudioProcessor@[0-9a-f]+"/,
    'registerProcessor("rawAudioProcessor"'
  );
  expect(stale).not.toBe(source);
  return URL.createObjectURL(
    new Blob([stale], { type: "application/javascript" })
  );
}

describe("self-hosted worklets", () => {
  let input: MediaDeviceInput | null = null;

  afterEach(async () => {
    await input?.close();
    input = null;
  });

  it("runs the published worklet file", async () => {
    input = await MediaDeviceInput.create({
      sampleRate: 16000,
      format: "pcm",
      workletPaths: { rawAudioProcessor: PUBLISHED_WORKLET },
    });

    const event = await new Promise<InputMessageEvent>(resolve => {
      input!.addListener(resolve);
    });

    expect(event.data[0]).toBeInstanceOf(Int16Array);
  });

  it("fails before capturing audio when the worklet is from another version", async () => {
    const path = await staleWorkletUrl();
    const getUserMedia = vi.spyOn(navigator.mediaDevices, "getUserMedia");
    try {
      await expect(
        MediaDeviceInput.create({
          sampleRate: 16000,
          format: "pcm",
          workletPaths: { rawAudioProcessor: path },
        })
      ).rejects.toThrow(
        `The rawAudioProcessor worklet loaded from ${path} does not match this version of @elevenlabs/client`
      );
      expect(getUserMedia).not.toHaveBeenCalled();
    } finally {
      getUserMedia.mockRestore();
      URL.revokeObjectURL(path);
    }
  });
});
