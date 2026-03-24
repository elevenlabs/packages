import { describe, it, expect } from "vitest";
import { encodeAudio, decodeAudio, calculateMaxVolume } from "./audio";

describe("encodeAudio", () => {
  it("encodes silence as PCM zeros", () => {
    const silence = new Float32Array([0, 0, 0, 0]);
    const encoded = encodeAudio(silence, "pcm");
    expect(encoded.length).toBe(8); // 4 samples * 2 bytes
    expect(Array.from(encoded)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("encodes positive PCM sample correctly", () => {
    const data = new Float32Array([1.0]);
    const encoded = encodeAudio(data, "pcm");
    const view = new DataView(encoded.buffer);
    expect(view.getInt16(0, true)).toBe(32767);
  });

  it("encodes negative PCM sample correctly", () => {
    const data = new Float32Array([-1.0]);
    const encoded = encodeAudio(data, "pcm");
    const view = new DataView(encoded.buffer);
    expect(view.getInt16(0, true)).toBe(-32768);
  });

  it("clamps values outside [-1, 1] for PCM", () => {
    const data = new Float32Array([2.0, -2.0]);
    const encoded = encodeAudio(data, "pcm");
    const view = new DataView(encoded.buffer);
    expect(view.getInt16(0, true)).toBe(32767);
    expect(view.getInt16(2, true)).toBe(-32768);
  });

  it("encodes ulaw with correct byte length", () => {
    const data = new Float32Array([0, 0.5, -0.5, 1.0]);
    const encoded = encodeAudio(data, "ulaw");
    expect(encoded.length).toBe(4); // 1 byte per sample
  });

  it("encodes silence as ulaw 0xFF", () => {
    const silence = new Float32Array([0]);
    const encoded = encodeAudio(silence, "ulaw");
    // ulaw silence is 0xFF (positive zero after bias and complement)
    expect(encoded[0]).toBe(0xff);
  });
});

describe("decodeAudio", () => {
  it("decodes PCM silence to zeros", () => {
    const pcm = new Int16Array([0, 0, 0, 0]);
    const decoded = decodeAudio(pcm.buffer, "pcm");
    expect(decoded.length).toBe(4);
    expect(Array.from(decoded)).toEqual([0, 0, 0, 0]);
  });

  it("decodes PCM max positive sample", () => {
    const pcm = new Int16Array([32767]);
    const decoded = decodeAudio(pcm.buffer, "pcm");
    expect(decoded[0]).toBeCloseTo(1.0, 3);
  });

  it("decodes PCM max negative sample", () => {
    const pcm = new Int16Array([-32768]);
    const decoded = decodeAudio(pcm.buffer, "pcm");
    expect(decoded[0]).toBe(-1.0);
  });

  it("decodes ulaw with correct sample count", () => {
    const ulaw = new Uint8Array([0xff, 0x7f, 0x80, 0x00]);
    const decoded = decodeAudio(ulaw.buffer, "ulaw");
    expect(decoded.length).toBe(4);
  });

  it("roundtrips ulaw-encoded silence back to near-zero", () => {
    const silence = new Float32Array([0]);
    const encoded = encodeAudio(silence, "ulaw");
    const decoded = decodeAudio(encoded.buffer, "ulaw");
    expect(Math.abs(decoded[0])).toBeLessThan(0.01);
  });
});

describe("PCM roundtrip", () => {
  it("encodes and decodes PCM with minimal loss", () => {
    const original = new Float32Array([0.0, 0.5, -0.5, 0.25, -0.75]);
    const encoded = encodeAudio(original, "pcm");
    const decoded = decodeAudio(encoded.buffer, "pcm");
    for (let i = 0; i < original.length; i++) {
      expect(decoded[i]).toBeCloseTo(original[i], 3);
    }
  });
});

describe("ulaw roundtrip", () => {
  it("encodes and decodes ulaw preserving sign and approximate magnitude", () => {
    const original = new Float32Array([0.5, -0.5, 0.25, -0.25]);
    const encoded = encodeAudio(original, "ulaw");
    const decoded = decodeAudio(encoded.buffer, "ulaw");
    for (let i = 0; i < original.length; i++) {
      // ulaw is lossy — verify sign is preserved and magnitude is in the ballpark
      expect(Math.sign(decoded[i])).toBe(Math.sign(original[i]));
      expect(Math.abs(decoded[i] - original[i])).toBeLessThan(0.15);
    }
  });
});

describe("calculateMaxVolume", () => {
  it("returns 0 for silence", () => {
    const silence = new Float32Array([0, 0, 0]);
    expect(calculateMaxVolume(silence)).toBe(0);
  });

  it("returns 1 for max amplitude", () => {
    const loud = new Float32Array([0, 1.0, 0]);
    expect(calculateMaxVolume(loud)).toBe(1);
  });

  it("returns absolute value for negative samples", () => {
    const data = new Float32Array([0, -0.75, 0.5]);
    expect(calculateMaxVolume(data)).toBe(0.75);
  });

  it("returns 0 for empty array", () => {
    const empty = new Float32Array([]);
    expect(calculateMaxVolume(empty)).toBe(0);
  });
});
