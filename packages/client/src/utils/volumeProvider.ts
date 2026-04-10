import { calculateVolume } from "./calculateVolume.js";

export interface VolumeProvider {
  /** Returns current audio level as a scalar 0-1. */
  getVolume(): number;
  /**
   * Writes byte frequency data (0-255) into the provided buffer, focused on
   * the human voice range (100-8000 Hz). The buffer length determines the
   * number of frequency bands returned.
   */
  getByteFrequencyData(buffer: Uint8Array<ArrayBuffer>): void;
}

export const NO_VOLUME: VolumeProvider = {
  getVolume: () => 0,
  getByteFrequencyData: () => {},
};

// Voice-relevant frequency range, matching the React Native multiband
// processor config so both platforms return comparable data.
export const MIN_VOICE_FREQUENCY = 100;
export const MAX_VOICE_FREQUENCY = 8000;

/**
 * Resamples the voice-relevant portion of raw frequency data into an output
 * buffer using linear interpolation. This ensures both web and React Native
 * return comparable frequency data focused on the human voice range.
 */
export function resampleVoiceRange(
  raw: Uint8Array<ArrayBuffer>,
  buffer: Uint8Array<ArrayBuffer>,
  sampleRate: number
): void {
  const binCount = raw.length;
  const hzPerBin = sampleRate / 2 / binCount;
  const minBin = Math.floor(MIN_VOICE_FREQUENCY / hzPerBin);
  const maxBin = Math.min(Math.ceil(MAX_VOICE_FREQUENCY / hzPerBin), binCount);
  const voiceBinCount = maxBin - minBin;
  const outLen = buffer.length;
  for (let i = 0; i < outLen; i++) {
    const pos = (i / outLen) * voiceBinCount;
    const lo = minBin + Math.floor(pos);
    const hi = Math.min(lo + 1, maxBin - 1);
    const t = pos - Math.floor(pos);
    buffer[i] = Math.round(raw[lo] * (1 - t) + raw[hi] * t);
  }
}

export function createAnalyserVolumeProvider(
  analyser: AnalyserNode,
  sampleRate: number
): VolumeProvider {
  const binCount = analyser.frequencyBinCount;
  let rawData: Uint8Array<ArrayBuffer> | undefined;
  // Resampled buffer used by getVolume() so the scalar is computed from the
  // voice-frequency range only, matching RN's RMS processor behaviour.
  let voiceData: Uint8Array<ArrayBuffer> | undefined;

  return {
    getVolume() {
      rawData ??= new Uint8Array(binCount) as Uint8Array<ArrayBuffer>;
      voiceData ??= new Uint8Array(binCount) as Uint8Array<ArrayBuffer>;
      analyser.getByteFrequencyData(rawData);
      resampleVoiceRange(rawData, voiceData, sampleRate);
      return calculateVolume(voiceData);
    },
    getByteFrequencyData(buffer: Uint8Array<ArrayBuffer>) {
      rawData ??= new Uint8Array(binCount) as Uint8Array<ArrayBuffer>;
      analyser.getByteFrequencyData(rawData);
      resampleVoiceRange(rawData, buffer, sampleRate);
    },
  };
}
