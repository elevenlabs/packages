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

export function int16ArrayToBase64(int16Array: Int16Array): string {
  const uint8 = new Uint8Array(
    int16Array.buffer,
    int16Array.byteOffset,
    int16Array.byteLength
  );
  let binary = "";
  for (let i = 0; i < uint8.length; i++) {
    binary += String.fromCharCode(uint8[i]);
  }
  return btoa(binary);
}

/** Resample PCM16 audio using linear interpolation. */
export function resamplePCM(
  pcmData: Int16Array,
  fromRate: number,
  toRate: number
): Int16Array {
  if (fromRate === toRate) return pcmData;
  const ratio = fromRate / toRate;
  const newLength = Math.floor(pcmData.length / ratio);
  const result = new Int16Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const floor = Math.floor(srcIndex);
    const ceil = Math.min(floor + 1, pcmData.length - 1);
    const t = srcIndex - floor;
    result[i] = Math.round(pcmData[floor] * (1 - t) + pcmData[ceil] * t);
  }
  return result;
}
