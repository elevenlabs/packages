import { describe, expect, it } from "vitest";
import { splitAudioTags, stripAudioTags } from "./audioTags.js";

const NON_ASCII_TAGS = [
  "[차분]",
  "[穏やかに]",
  "[温柔]",
  "[ríe]",
  "[spokojnie]",
  "[शांत]",
  "[ใจเย็น]",
  "[laughs 2]",
];

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
    [
      "[happy] Hello [docs](https://example.com)",
      "Hello [docs](https://example.com)",
    ],
    ["[차분] 안녕하세요 [정중] 고객님.", "안녕하세요 고객님."],
    ["¡Claro [ríe]!", "¡Claro!"],
    [
      "See [문서](https://example.com) [laughs]",
      "See [문서](https://example.com)",
    ],
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

describe("splitAudioTags", () => {
  it("splits audio tags from text", () => {
    expect(splitAudioTags("Hello [laughs] world")).toEqual([
      { type: "text", content: "Hello " },
      { type: "audioTag", content: "[laughs]" },
      { type: "text", content: " world" },
    ]);
  });

  it("parses multi word audio tags", () => {
    expect(splitAudioTags("Hello [clears throat] world")).toEqual([
      { type: "text", content: "Hello " },
      { type: "audioTag", content: "[clears throat]" },
      { type: "text", content: " world" },
    ]);
  });

  it.each([
    "See [docs](https://example.com)",
    "See [문서](https://example.com)",
    "No tags here.",
  ])("leaves %j as one text part", input => {
    expect(splitAudioTags(input)).toEqual([{ type: "text", content: input }]);
  });

  it("returns no parts for empty text", () => {
    expect(splitAudioTags("")).toEqual([]);
  });

  it.each(NON_ASCII_TAGS)("splits out %s", tag => {
    expect(splitAudioTags(`Hi ${tag}.`)).toEqual([
      { type: "text", content: "Hi " },
      { type: "audioTag", content: tag },
      { type: "text", content: "." },
    ]);
  });

  it("splits leading, trailing and consecutive tags", () => {
    expect(splitAudioTags("[차분][laughs] 안녕 [ríe]")).toEqual([
      { type: "audioTag", content: "[차분]" },
      { type: "audioTag", content: "[laughs]" },
      { type: "text", content: " 안녕 " },
      { type: "audioTag", content: "[ríe]" },
    ]);
  });

  it.each(NON_ASCII_TAGS)("strips every tag it splits out: %s", tag => {
    expect(stripAudioTags(tag)).toBe("");
  });
});
