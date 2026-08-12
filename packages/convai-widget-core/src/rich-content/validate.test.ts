import { describe, expect, it } from "vitest";
import { parseButtonGroupProps } from "./validate";

const parseButtons = (buttons: unknown) => parseButtonGroupProps({ buttons });

describe("button parsing", () => {
  it("keeps only the buttons that can do something on press", () => {
    expect(
      parseButtons([
        { type: "message", label: "Ask more", message: "Tell me more" },
        { label: "No message" },
        { message: "No label" },
        { type: "webhook", label: "Unknown type" },
        "not an object",
      ])
    ).toEqual({
      buttons: [
        { type: "message", label: "Ask more", message: "Tell me more" },
      ],
    });
  });

  it("defaults a button with no type to a message button", () => {
    // The sender states the type, but a button without one is unambiguous
    // when it carries a message, so it is read as such rather than dropped.
    expect(
      parseButtons([{ label: "Ask more", message: "Tell me more" }])
    ).toEqual({
      buttons: [
        { type: "message", label: "Ask more", message: "Tell me more" },
      ],
    });
  });

  it("keeps a link button", () => {
    const button = {
      type: "link",
      label: "Read the docs",
      link: "https://cdn.test/docs",
    };

    expect(parseButtons([button])).toEqual({ buttons: [button] });
  });

  it.each<{ description: string; link: string }>([
    { description: "plain http", link: "http://cdn.test/a" },
    { description: "javascript", link: "javascript:alert(1)" },
    { description: "a bare path", link: "/local/a" },
    { description: "a data url", link: "data:text/html,<script>" },
  ])("drops a link pointing at $description", ({ link }) => {
    expect(parseButtons([{ type: "link", label: "Bad", link }])).toBeNull();
  });

  it("keeps a long link whole rather than clipping it to the text limit", () => {
    // Signed urls run well past the text limit. Clipping one would leave its
    // scheme intact, so it would pass the check and reach the browser as a
    // dead link instead of being dropped.
    const button = {
      type: "link",
      label: "Long",
      link: `https://cdn.test/${"a".repeat(600)}?signature=abc`,
    };

    expect(parseButtons([button])).toEqual({ buttons: [button] });
  });

  it("drops a link longer than the url limit", () => {
    const link = `https://cdn.test/${"a".repeat(2048)}`;

    expect(parseButtons([{ type: "link", label: "Huge", link }])).toBeNull();
  });

  it("trims text and caps its length", () => {
    const parsed = parseButtons([
      { label: `  ${"a".repeat(600)}  `, message: " Tell me more " },
    ]);

    expect(parsed?.buttons).toEqual([
      { type: "message", label: "a".repeat(500), message: "Tell me more" },
    ]);
  });

  it("caps the number of buttons", () => {
    const parsed = parseButtons(
      Array.from({ length: 6 }, (_, i) => ({
        label: `Label ${i}`,
        message: `Message ${i}`,
      }))
    );

    expect(parsed?.buttons).toHaveLength(3);
  });
});

describe("parseButtonGroupProps", () => {
  it.each<{ description: string; input: unknown }>([
    { description: "null", input: null },
    { description: "an array", input: [{ buttons: [] }] },
    { description: "missing buttons", input: {} },
    { description: "buttons that are not an array", input: { buttons: {} } },
    {
      description: "buttons that all lack a label or message",
      input: { buttons: [{ label: "No message" }, { message: "No label" }] },
    },
  ])("rejects $description", ({ input }) => {
    expect(parseButtonGroupProps(input)).toBeNull();
  });
});
