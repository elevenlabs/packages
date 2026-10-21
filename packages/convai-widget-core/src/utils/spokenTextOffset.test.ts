import { describe, expect, it } from "vitest";
import { spokenTextOffset } from "./spokenTextOffset";

function revealed(display: string, spoken: string) {
  return display.slice(0, spokenTextOffset(display, spoken));
}

describe("spokenTextOffset", () => {
  it("reveals the spoken words and the punctuation after them", () => {
    expect(revealed("Hello, how are you?", "Hello, ")).toBe("Hello,");
    expect(revealed("Hello, how are you?", "Hello, how are you?")).toBe(
      "Hello, how are you?"
    );
  });

  it("reveals a partly spoken word up to what has been said", () => {
    expect(revealed("Hello there.", "Hello the")).toBe("Hello the");
  });

  it("ignores case and spoken punctuation differences", () => {
    expect(revealed("OK - sounds good.", "ok sounds")).toBe("OK - sounds");
  });

  it("skips markdown that is not spoken", () => {
    const display = "## Options\n\n- **Fast** shipping";
    expect(revealed(display, "Options Fast ")).toBe("## Options\n\n- **Fast**");
  });

  it("keeps a link hidden until the words after it are spoken", () => {
    const display = "See [our docs](https://example.com/docs/setup) for more.";
    expect(revealed(display, "See our docs ")).toBe("See [our docs");
    expect(revealed(display, "See our docs for ")).toBe(
      "See [our docs](https://example.com/docs/setup) for"
    );
  });

  it("does not run ahead when a word is spoken differently", () => {
    const display = "It costs 100 dollars today.";
    expect(revealed(display, "It costs one hundred ")).toBe("It costs");
    expect(revealed(display, "It costs one hundred dollars ")).toBe(
      "It costs 100 dollars"
    );
  });

  it("matches repeated words in order", () => {
    const display = "No, no, no. Yes.";
    expect(revealed(display, "No, no, ")).toBe("No, no,");
  });
});
