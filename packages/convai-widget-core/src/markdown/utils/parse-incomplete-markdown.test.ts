import { describe, expect, it } from "vitest";
import { parseIncompleteMarkdown } from "./parse-incomplete-markdown";

describe("parseIncompleteMarkdown", () => {
  it("leaves the text of an incomplete link unformatted", () => {
    expect(parseIncompleteMarkdown("See [snake_case](https://exa")).toBe(
      "See snake_case"
    );
  });

  it("drops an incomplete image and still closes other formatting", () => {
    expect(parseIncompleteMarkdown("**Bold ![alt](https://exa")).toBe(
      "**Bold **"
    );
  });
});
