import { describe, it, expect, afterEach, beforeAll, vi } from "vitest";
import { userEvent } from "vitest/browser";
import type { RemoteAudioTrack } from "livekit-client";
import { WebAudioAdapter } from "../platform/web/webAudioAdapter.js";

const OUTPUT_FORMAT = { format: "pcm", sampleRate: 48000 } as const;
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

function agentTrack() {
  const context = new AudioContext({ sampleRate: OUTPUT_FORMAT.sampleRate });
  const oscillator = context.createOscillator();
  const destination = context.createMediaStreamDestination();
  oscillator.connect(destination);
  oscillator.start();
  const [mediaStreamTrack] = destination.stream.getAudioTracks();
  return { mediaStreamTrack } as unknown as RemoteAudioTrack;
}

function captureAtDeviceRate(deviceRate: number, libsampleratePath?: string) {
  const track = agentTrack();
  const NativeAudioContext = AudioContext;
  vi.stubGlobal(
    "AudioContext",
    class extends NativeAudioContext {
      constructor() {
        super({ sampleRate: deviceRate });
      }
    }
  );
  const addModule = vi.spyOn(AudioWorklet.prototype, "addModule");
  const adapter = new WebAudioAdapter();
  const chunks: Int16Array[] = [];
  const setup = adapter.setupOutputAnalysis(
    track,
    OUTPUT_FORMAT,
    audioData => chunks.push(new Int16Array(audioData)),
    undefined,
    libsampleratePath
  );
  return { adapter, setup, chunks, addModule };
}

describe("WebAudioAdapter output capture", () => {
  let adapter: WebAudioAdapter | null = null;

  beforeAll(() => userEvent.click(document.body));

  afterEach(() => {
    adapter?.cleanup();
    adapter = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("captures without libsamplerate when the device runs at the output rate", async () => {
    const capture = captureAtDeviceRate(OUTPUT_FORMAT.sampleRate);
    adapter = capture.adapter;
    await capture.setup;

    await vi.waitFor(() => expect(capture.chunks.length).toBeGreaterThan(5));
    expect(capture.addModule).toHaveBeenCalledTimes(1);
  });

  it.each([44100, 16000, 96000])(
    "captures only resampled audio on a %i Hz device",
    async deviceRate => {
      const capture = captureAtDeviceRate(
        deviceRate,
        constantResampler({ fail: false, delayMs: 300 })
      );
      adapter = capture.adapter;
      await capture.setup;

      await vi.waitFor(() => expect(capture.chunks.length).toBeGreaterThan(5));
      for (const chunk of capture.chunks) {
        expect(chunk).toEqual(
          new Int16Array(chunk.length).fill(RESAMPLED * 32767)
        );
      }
    }
  );

  it("fails if the resampler can't be created", async () => {
    const capture = captureAtDeviceRate(
      44100,
      constantResampler({ fail: true, delayMs: 0 })
    );
    adapter = capture.adapter;

    await expect(capture.setup).rejects.toThrow(
      "Failed to create audio resampler: invalid outputSampleRate"
    );
  });

  it("fails if libsamplerate is not loaded", async () => {
    const capture = captureAtDeviceRate(44100, scriptUrl(""));
    adapter = capture.adapter;

    await expect(capture.setup).rejects.toThrow(
      "Failed to create audio resampler: libsamplerate is not loaded"
    );
  });

  it("fails instead of waiting forever when cleaned up during setup", async () => {
    const capture = captureAtDeviceRate(
      44100,
      constantResampler({ fail: false, delayMs: 2000 })
    );
    adapter = capture.adapter;
    await vi.waitFor(() => expect(capture.addModule).toHaveBeenCalledTimes(2));
    await capture.addModule.mock.results[1].value;
    await new Promise(resolve => setTimeout(resolve, 100));
    capture.adapter.cleanup();

    await expect(capture.setup).rejects.toThrow(
      "Audio capture closed during setup"
    );
  });
});
