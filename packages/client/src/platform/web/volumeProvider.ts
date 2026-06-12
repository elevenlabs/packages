import { calculateVolume } from "../../utils/calculateVolume.js";
import {
  type VolumeProvider,
  resampleVoiceRange,
} from "../../utils/volumeProvider.js";

export { type VolumeProvider } from "../../utils/volumeProvider.js";

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
