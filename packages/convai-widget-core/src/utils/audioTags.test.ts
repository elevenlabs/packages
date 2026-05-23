import { describe, expect, it } from "vitest";

import { parseTextWithAudioTags } from "./audioTags";
import { stripAudioTags } from "./stripAudioTags";

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

    it("parses multi-word audio tags", () => {
      expect(parseTextWithAudioTags("Hello [clears throat] world")).toEqual([
        { type: "text", content: "Hello " },
        { type: "audioTag", content: "[clears throat]" },
        { type: "text", content: " world" },
      ]);
    });
  });

  describe("stripAudioTags", () => {
    it("strips audio tags but not markdown links", () => {
      expect(stripAudioTags("[happy] Hello [docs](https://example.com)")).toBe(
        "Hello [docs](https://example.com)"
      );
    });
  });
});
