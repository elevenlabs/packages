import { describe, it, expect, afterEach, vi } from "vitest";
import { MediaDeviceInput } from "../platform/web/input.js";
import type { InputMessageEvent } from "../InputController.js";

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

  it("stops the new microphone track when closed while switching devices", async () => {
    const created = await MediaDeviceInput.create({
      sampleRate: 16000,
      format: "pcm",
    });

    const getUserMedia = navigator.mediaDevices.getUserMedia.bind(
      navigator.mediaDevices
    );
    const newTracks: MediaStreamTrack[] = [];
    vi.spyOn(navigator.mediaDevices, "getUserMedia").mockImplementation(
      async constraints => {
        const stream = await getUserMedia(constraints);
        newTracks.push(...stream.getTracks());
        return stream;
      }
    );

    const switching = created.setDevice({});
    await created.close();
    await switching;

    expect(newTracks.length).toBeGreaterThan(0);
    expect(newTracks.every(track => track.readyState === "ended")).toBe(true);
  });
});
