/**
 * Calculates a normalised volume level (0–1) from raw byte frequency data
 * as returned by AnalyserNode.getByteFrequencyData().
 */
export function calculateVolumeFromFrequencyData(data: Uint8Array): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] / 255;
  const volume = sum / data.length;
  return volume < 0 ? 0 : volume > 1 ? 1 : volume;
}

export function arrayBufferToBase64(b: ArrayBufferLike) {
  const buffer = new Uint8Array(b);
  // @ts-ignore
  const base64Data = window.btoa(String.fromCharCode(...buffer));
  return base64Data;
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}
