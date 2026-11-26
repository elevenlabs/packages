import { afterEach, describe, expect, it, vi } from "vitest";
import { userEvent } from "vitest/browser";
import { webScribeMicrophoneSetup } from "./scribeMicrophone.js";

const MIC_SAMPLE_RATE = 48000;
const SCRIBE_SAMPLE_RATE = 16000;
const TONE_AMPLITUDE = 0.25;
const TONE_DB = 20 * Math.log10(TONE_AMPLITUDE);
const ANALYSIS_SAMPLES = 8192;

async function toneMicrophone(frequencies: number[]) {
  await userEvent.click(document.body);
  const context = new AudioContext({ sampleRate: MIC_SAMPLE_RATE });
  const destination = context.createMediaStreamDestination();
  for (const frequency of frequencies) {
    const oscillator = new OscillatorNode(context, { frequency });
    oscillator
      .connect(new GainNode(context, { gain: TONE_AMPLITUDE }))
      .connect(destination);
    oscillator.start();
  }
  await context.resume();

  const [track] = destination.stream.getAudioTracks();
  const settings = track.getSettings();
  vi.spyOn(track, "getSettings").mockReturnValue({
    ...settings,
    sampleRate: MIC_SAMPLE_RATE,
  });
  vi.spyOn(navigator.mediaDevices, "getUserMedia").mockResolvedValue(
    destination.stream
  );
  return context;
}

function decodePcm16(base64: string) {
  const bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
  return Array.from(new Int16Array(bytes.buffer), sample => sample / 32768);
}

async function captureScribeAudio(frequencies: number[]) {
  const micContext = await toneMicrophone(frequencies);
  const samples: number[] = [];
  const { cleanup } = await webScribeMicrophoneSetup({}, chunk =>
    samples.push(...decodePcm16(chunk))
  );
  try {
    await vi.waitFor(
      () => expect(samples.length).toBeGreaterThan(2 * ANALYSIS_SAMPLES),
      { timeout: 10000 }
    );
  } finally {
    cleanup();
    await micContext.close();
  }
  return samples.slice(-ANALYSIS_SAMPLES);
}

function levelDb(samples: number[], frequency: number) {
  let real = 0;
  let imaginary = 0;
  let windowSum = 0;
  samples.forEach((sample, i) => {
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / samples.length);
    const phase = (2 * Math.PI * frequency * i) / SCRIBE_SAMPLE_RATE;
    real += sample * window * Math.cos(phase);
    imaginary -= sample * window * Math.sin(phase);
    windowSum += window;
  });
  return 20 * Math.log10((2 * Math.hypot(real, imaginary)) / windowSum);
}

describe("Scribe microphone audio from a 48 kHz mic", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps 1 kHz and drops 12 kHz instead of folding it to 4 kHz", async () => {
    const samples = await captureScribeAudio([1000, 12000]);

    expect(levelDb(samples, 1000)).toBeCloseTo(TONE_DB, 0);
    expect(levelDb(samples, 4000)).toBeLessThan(TONE_DB - 60);
  });
});
