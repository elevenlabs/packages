import { stripAudioTags } from "@elevenlabs/client";
import { describe, expect, it } from "vitest";

import { parseTextWithAudioTags } from "./audioTags";

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

describe("audioTags", () => {
  describe("parseTextWithAudioTags", () => {
    it("parses a single audio tag", () => {
      expect(parseTextWithAudioTags("Hello [laughs] world")).toEqual([
        { type: "text", content: "Hello " },
        { type: "audioTag", content: "[laughs]" },
        { type: "text", content: " world" },
      ]);
    });

    it("does not parse markdown links as audio tags", () => {
      expect(parseTextWithAudioTags("See [docs](https://example.com)")).toEqual(
        [{ type: "text", content: "See [docs](https://example.com)" }]
      );
    });

    it("does not parse non ASCII markdown links as audio tags", () => {
      expect(parseTextWithAudioTags("See [문서](https://example.com)")).toEqual(
        [{ type: "text", content: "See [문서](https://example.com)" }]
      );
    });

    it("parses multi-word audio tags", () => {
      expect(parseTextWithAudioTags("Hello [clears throat] world")).toEqual([
        { type: "text", content: "Hello " },
        { type: "audioTag", content: "[clears throat]" },
        { type: "text", content: " world" },
      ]);
    });

    it.each(NON_ASCII_TAGS)("parses %s as an audio tag", tag => {
      expect(parseTextWithAudioTags(`Hi ${tag}.`)).toEqual([
        { type: "text", content: "Hi " },
        { type: "audioTag", content: tag },
        { type: "text", content: "." },
      ]);
    });

    it("parses leading, trailing and consecutive tags", () => {
      expect(parseTextWithAudioTags("[차분][laughs] 안녕 [ríe]")).toEqual([
        { type: "audioTag", content: "[차분]" },
        { type: "audioTag", content: "[laughs]" },
        { type: "text", content: " 안녕 " },
        { type: "audioTag", content: "[ríe]" },
      ]);
    });
  });

  describe("stripAudioTags", () => {
    it.each([
      [
        "[happy] Hello [docs](https://example.com)",
        "Hello [docs](https://example.com)",
      ],
      ["Hello [laughs].", "Hello."],
      ["[차분] 안녕하세요 [정중] 고객님.", "안녕하세요 고객님."],
      ["¡Claro [ríe]!", "¡Claro!"],
      [
        "See [문서](https://example.com) [laughs]",
        "See [문서](https://example.com)",
      ],
    ])("strips %j to %j", (input, expected) => {
      expect(stripAudioTags(input)).toBe(expected);
    });

    it.each(NON_ASCII_TAGS)("strips every tag the widget styles: %s", tag => {
      expect(stripAudioTags(tag)).toBe("");
    });
  });
});
