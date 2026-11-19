import { describe, it, expect, afterEach, vi } from "vitest";
import { MediaDeviceInput } from "../platform/web/input.js";
import type { InputMessageEvent } from "../InputController.js";

describe("MediaDeviceInput", () => {
  let input: MediaDeviceInput | null = null;

  afterEach(async () => {
    await input?.close();
    input = null;
    vi.restoreAllMocks();
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

  describe("with resampling", () => {
    const SAMPLE_RATE = 16000;
    const RESAMPLED = 0.25;

    function scriptUrl(source: string) {
      return URL.createObjectURL(
        new Blob([source], { type: "application/javascript" })
      );
    }

    function constantResampler({
      fail,
      delayMs,
    }: {
      fail: boolean;
      delayMs: number;
    }) {
      return scriptUrl(`globalThis.LibSampleRate = {
        create: async (_channels, inputSampleRate, outputSampleRate) => {
          // worklet scope has no setTimeout
          const emptyModule = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
          const end = Date.now() + ${delayMs};
          while (Date.now() < end) {
            await WebAssembly.compile(emptyModule);
          }
          if (${fail}) {
            throw "invalid outputSampleRate";
          }
          const ratio = outputSampleRate / inputSampleRate;
          return {
            full: samples =>
              new Float32Array(Math.round(samples.length * ratio)).fill(${RESAMPLED}),
          };
        },
      };`);
    }

    function createInputAtDeviceRate(libsampleratePath: string) {
      vi.spyOn(
        navigator.mediaDevices,
        "getSupportedConstraints"
      ).mockReturnValue({});
      const stopTrack = vi.spyOn(MediaStreamTrack.prototype, "stop");
      const created = MediaDeviceInput.create({
        sampleRate: SAMPLE_RATE,
        format: "pcm",
        libsampleratePath,
      });
      return { created, stopTrack };
    }

    it("sends only resampled audio once the resampler is ready", async () => {
      const { created } = createInputAtDeviceRate(
        constantResampler({ fail: false, delayMs: 300 })
      );
      input = await created;

      const chunks: Int16Array[] = [];
      input.addListener(({ data: [audio] }) => {
        chunks.push(audio as unknown as Int16Array);
      });
      await vi.waitFor(() => expect(chunks.length).toBeGreaterThan(5));

      for (const chunk of chunks) {
        expect(chunk).toEqual(
          new Int16Array(chunk.length).fill(RESAMPLED * 32767)
        );
      }
    });

    it("fails and releases the microphone if the resampler can't be created", async () => {
      const { created, stopTrack } = createInputAtDeviceRate(
        constantResampler({ fail: true, delayMs: 0 })
      );

      await expect(created).rejects.toThrow(
        "Failed to create audio resampler: invalid outputSampleRate"
      );
      expect(stopTrack).toHaveBeenCalled();
    });

    it("fails if libsamplerate is not loaded", async () => {
      const { created } = createInputAtDeviceRate(scriptUrl(""));

      await expect(created).rejects.toThrow(
        "Failed to create audio resampler: libsamplerate is not loaded"
      );
    });
  });
});
