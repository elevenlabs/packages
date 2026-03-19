import { describe, it, expect } from "vitest";
import { arrayBufferToBase64, base64ToArrayBuffer } from "./audio";

describe("audio utils", () => {
  it("arrayBufferToBase64 encodes correctly", () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
    const base64 = arrayBufferToBase64(bytes.buffer);
    expect(base64).toBe("SGVsbG8=");
    expect(atob(base64)).toBe("Hello");
  });

  it("base64ToArrayBuffer decodes correctly", () => {
    const buffer = base64ToArrayBuffer("SGVsbG8=");
    expect(new Uint8Array(buffer)).toEqual(
      new Uint8Array([72, 101, 108, 108, 111])
    );
  });

  it("roundtrips correctly", () => {
    const original = new Uint8Array([0, 1, 127, 128, 255]);
    const base64 = arrayBufferToBase64(original.buffer);
    const decoded = new Uint8Array(base64ToArrayBuffer(base64));
    expect(decoded).toEqual(original);
  });

  it("handles empty buffer", () => {
    const empty = new Uint8Array(0);
    const base64 = arrayBufferToBase64(empty.buffer);
    expect(base64).toBe("");
    expect(new Uint8Array(base64ToArrayBuffer(base64))).toEqual(empty);
  });

  it("handles large buffer without stack overflow", () => {
    const large = new Uint8Array(100_000);
    for (let i = 0; i < large.length; i++) {
      large[i] = i % 256;
    }
    const base64 = arrayBufferToBase64(large.buffer);
    const decoded = new Uint8Array(base64ToArrayBuffer(base64));
    expect(decoded).toEqual(large);
  });
});
