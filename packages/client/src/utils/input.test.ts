import { describe, it, expect, afterEach } from "vitest";
import { MediaDeviceInput, type InputMessageEvent } from "./input.js";

describe("MediaDeviceInput", () => {
  let input: MediaDeviceInput | null = null;

  afterEach(async () => {
    await input?.close();
    input = null;
  });

  it("delivers audio data to listeners", async () => {
    input = await MediaDeviceInput.create({
      sampleRate: 16000,
      format: "pcm",
    });

    const event = await new Promise<InputMessageEvent>(resolve => {
      input!.addListener(resolve);
    });

    const [encodedAudio, volume] = event.data;
    expect(encodedAudio).toBeInstanceOf(Int16Array);
    expect(encodedAudio.length).toBeGreaterThan(0);
    expect(volume).toBeTypeOf("number");
  });
});
