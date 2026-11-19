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
    ["Hello [laughs] there.", "Hello there."],
    ["Hello [laughs] [sighs] there.", "Hello there."],
    ["Hello [laughs].", "Hello."],
    ["Hello [laughs]!", "Hello!"],
    ["Bonjour [rit] !", "Bonjour !"],
    ["Hello[laughs] world", "Hello world"],
    ["Hello [laughs]world", "Hello world"],
    ["Hello[laughs]world", "Helloworld"],
    ["こんにちは[笑う]元気です。", "こんにちは元気です。"],
    ["안녕 [차분] 고객님", "안녕 고객님"],
    ["Line one [laughs]\nLine two", "Line one\nLine two"],
    ["Line one\n[laughs] Line two", "Line one\nLine two"],
    ["Line one\r\n\t[laughs]\tLine two", "Line one\r\nLine two"],
    ["Wait ([laughs] okay)", "Wait (okay)"],
    ["Wait (okay [laughs])", "Wait (okay)"],
    ["He said “[whispers] hi”", "He said “hi”"],
    ["Hello\u00a0[laughs]\u00a0there", "Hello there"],
    ["Hi 😀 [laughs] 😀 there", "Hi 😀 😀 there"],
    [
      "Okay [laughs] see [the docs](https://example.com).",
      "Okay see [the docs](https://example.com).",
    ],
    ["[laughs]", ""],
    ["[laughs] [sighs]", ""],
  ])("collapses spacing around tags in %j", (input, expected) => {
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
