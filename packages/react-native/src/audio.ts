/**
 * Audio encoding/decoding utilities.
 *
 * mu-law (G.711) implementation based on ITU-T Recommendation G.711:
 * https://www.itu.int/rec/T-REC-G.711
 *
 * mu-law is a companding algorithm used in telephony that compresses
 * 16-bit PCM audio into 8-bit values. It uses a logarithmic curve that
 * gives more resolution to quieter sounds (similar to how human hearing
 * perceives loudness logarithmically).
 *
 * Encoding steps (PCM → mu-law):
 *   1. Extract and remove the sign
 *   2. Add a bias (0x84 = 132) to shift the curve
 *   3. Find the segment (exponent) by counting leading bits
 *   4. Extract 4 mantissa bits from within that segment
 *   5. Pack as: [sign(1) | exponent(3) | mantissa(4)]
 *   6. Complement all bits (per G.711 spec, for transmission)
 *
 * Decoding is the reverse: complement, unpack, reconstruct.
 */

import type { FormatConfig } from "@elevenlabs/client";

/**
 * Bias added before encoding to ensure small values near zero
 * still map to distinct encoded values.
 */
const ULAW_BIAS = 132; // 0x84

/** Maximum magnitude that can be encoded (values above this are clipped). */
const ULAW_MAX_INPUT = 32635;

/** 16-bit PCM bounds and normalization scales. */
const PCM_INT16_MIN = -32768;
const PCM_INT16_MAX = 32767;
const PCM_INT16_NEGATIVE_SCALE = 32768;
const PCM_INT16_POSITIVE_SCALE = 32767;

/**
 * Encode a single 16-bit signed PCM sample (-32768..32767) to a mu-law byte.
 */
function ulawEncode(pcmSample: number): number {
  // Step 1: Extract sign and work with absolute value
  const isNegative = pcmSample < 0;
  let magnitude = isNegative ? -pcmSample : pcmSample;

  // Step 2: Clip to maximum encodable value
  if (magnitude > ULAW_MAX_INPUT) {
    magnitude = ULAW_MAX_INPUT;
  }

  // Step 3: Add bias
  magnitude += ULAW_BIAS;

  // Step 4: Find the exponent (segment number 0-7).
  // This is essentially floor(log2(magnitude)) - 6, clamped to 0-7.
  // We find it by checking which power-of-2 boundary the value falls in.
  let exponent = 7;
  let threshold = 0x4000; // Start at highest segment boundary
  while ((magnitude & threshold) === 0 && exponent > 0) {
    exponent--;
    threshold >>= 1; // Move to next lower boundary
  }

  // Step 5: Extract 4 mantissa bits from within the segment
  const mantissa = (magnitude >> (exponent + 3)) & 0x0f;

  // Step 6: Pack sign + exponent + mantissa, then complement all bits.
  // The complement is required by G.711 for transmission characteristics.
  const signBit = isNegative ? 0x80 : 0x00;
  const packed = signBit | (exponent << 4) | mantissa;
  return ~packed & 0xff;
}

/**
 * Decode a mu-law byte back to a 16-bit signed PCM sample.
 */
function ulawDecode(ulawByte: number): number {
  // Step 1: Undo the complement applied during encoding
  const inverted = ~ulawByte & 0xff;

  // Step 2: Unpack the fields
  const isNegative = (inverted & 0x80) !== 0;
  const exponent = (inverted >> 4) & 0x07;
  const mantissa = inverted & 0x0f;

  // Step 3: Reconstruct the magnitude.
  // Place the mantissa bits back in position, add bias, shift by exponent,
  // then remove the bias to get the original magnitude.
  let magnitude = ((mantissa << 3) + ULAW_BIAS) << exponent;
  magnitude -= ULAW_BIAS;

  return isNegative ? -magnitude : magnitude;
}

/** Clamp a float sample to [-1, 1] range. */
function clamp(value: number): number {
  return Math.max(-1, Math.min(1, value));
}

/** Convert a float [-1, 1] to a 16-bit signed integer. */
function floatToInt16(sample: number): number {
  const clamped = clamp(sample);
  return Math.round(
    clamped < 0
      ? clamped * PCM_INT16_NEGATIVE_SCALE
      : clamped * PCM_INT16_POSITIVE_SCALE
  );
}

/**
 * Convert float32 audio samples to the format expected by the server.
 */
export function encodeAudio(
  floatData: Float32Array,
  format: FormatConfig["format"]
): Uint8Array {
  if (format === "ulaw") {
    const encoded = new Uint8Array(floatData.length);
    for (let i = 0; i < floatData.length; i++) {
      encoded[i] = ulawEncode(floatToInt16(floatData[i]));
    }
    return encoded;
  }

  // PCM 16-bit little-endian: 2 bytes per sample
  const pcmData = new Uint8Array(floatData.length * 2);
  const view = new DataView(pcmData.buffer);
  for (let i = 0; i < floatData.length; i++) {
    view.setInt16(i * 2, floatToInt16(floatData[i]), true);
  }
  return pcmData;
}

/**
 * Convert encoded audio data from the server to float32 samples.
 */
export function decodeAudio(
  chunk: ArrayBuffer,
  format: FormatConfig["format"]
): Float32Array {
  if (format === "ulaw") {
    const bytes = new Uint8Array(chunk);
    const floatData = new Float32Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
      // Defensive clamp in case malformed/unknown input exceeds 16-bit range.
      const pcm = ulawDecode(bytes[i]);
      const clampedPcm = Math.max(PCM_INT16_MIN, Math.min(PCM_INT16_MAX, pcm));
      floatData[i] = clampedPcm / PCM_INT16_NEGATIVE_SCALE;
    }
    return floatData;
  }

  // PCM 16-bit little-endian: 2 bytes per sample
  const pcm = new Int16Array(chunk);
  const floatData = new Float32Array(pcm.length);
  for (let i = 0; i < pcm.length; i++) {
    floatData[i] = pcm[i] / PCM_INT16_NEGATIVE_SCALE;
  }
  return floatData;
}

/** Calculate peak volume (0-1) from float32 audio samples. */
export function calculateMaxVolume(floatData: Float32Array): number {
  let maxVolume = 0;
  for (let i = 0; i < floatData.length; i++) {
    const amplitude = Math.abs(floatData[i]);
    if (amplitude > maxVolume) maxVolume = amplitude;
  }
  return maxVolume;
}
