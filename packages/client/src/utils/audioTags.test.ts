import { describe, expect, it } from "vitest";
import { stripAudioTags } from "./audioTags.js";

describe("stripAudioTags", () => {
  it.each([
    ["[laughs] Sure thing!", "Sure thing!"],
    ["[speaking slowly] Okay", "Okay"],
    ["[차분] 안녕하세요 고객님", "안녕하세요 고객님"],
    ["확인해드릴게요. [정중]", "확인해드릴게요."],
    ["[穏やかに] こんにちは", "こんにちは"],
    ["[温柔] 你好", "你好"],
    ["[susurrando] Hola", "Hola"],
    ["[spokojnie] Cześć", "Cześć"],
    ["[शांत] नमस्ते", "नमस्ते"],
    ["[ใจเย็น] สวัสดี", "สวัสดี"],
  ])("strips tags from %j", (input, expected) => {
    expect(stripAudioTags(input)).toBe(expected);
  });

  it.each([
    "See [the docs](https://example.com).",
    "See [문서](https://example.com).",
    "No tags here.",
  ])("leaves %j unchanged", input => {
    expect(stripAudioTags(input)).toBe(input);
  });
});
