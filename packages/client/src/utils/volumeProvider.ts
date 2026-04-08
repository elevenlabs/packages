import { calculateVolume } from "./calculateVolume.js";

export interface VolumeProvider {
  getVolume(): number;
  getByteFrequencyData(buffer: Uint8Array<ArrayBuffer>): void;
}

export const NO_VOLUME: VolumeProvider = {
  getVolume: () => 0,
  getByteFrequencyData: () => {},
};

export function createAnalyserVolumeProvider(
  analyser: AnalyserNode
): VolumeProvider {
  let data: Uint8Array<ArrayBuffer> | undefined;
  return {
    getVolume() {
      data ??= new Uint8Array(
        analyser.frequencyBinCount
      ) as Uint8Array<ArrayBuffer>;
      analyser.getByteFrequencyData(data);
      return calculateVolume(data);
    },
    getByteFrequencyData(buffer: Uint8Array<ArrayBuffer>) {
      analyser.getByteFrequencyData(buffer);
    },
  };
}
