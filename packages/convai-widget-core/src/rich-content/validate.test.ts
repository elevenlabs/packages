import { describe, expect, it } from "vitest";
import { parseItemCardProps } from "./validate";

const valid = {
  id: "item_1",
  title: "Item title",
};

describe("parseItemCardProps", () => {
  it.each<{ description: string; input: unknown }>([
    { description: "null", input: null },
    { description: "a string", input: "item" },
    { description: "an array", input: [valid] },
    { description: "a missing id", input: { title: "Item title" } },
    { description: "a missing title", input: { id: "item_1" } },
    { description: "a blank title", input: { id: "item_1", title: "   " } },
    { description: "a boolean title", input: { id: "item_1", title: true } },
    { description: "an object title", input: { id: "item_1", title: {} } },
  ])("rejects $description", ({ input }) => {
    expect(parseItemCardProps(input)).toBeNull();
  });

  it.each<{ description: string; value: unknown; expected: string }>([
    { description: "an integer", value: 78, expected: "78" },
    { description: "a decimal", value: 1999.99, expected: "1999.99" },
  ])(
    "coerces $description so catalog data still renders",
    ({ value, expected }) => {
      expect(
        parseItemCardProps({ id: value, title: "Item title", price: value })
      ).toMatchObject({ id: expected, price: expected });
    }
  );

  it("rejects a non-finite number", () => {
    expect(
      parseItemCardProps({ id: Infinity, title: "Item title" })
    ).toBeNull();
  });

  it("keeps the required fields and defaults buttons to empty", () => {
    expect(parseItemCardProps(valid)).toEqual({
      id: "item_1",
      title: "Item title",
      subtitle: undefined,
      imageUrl: undefined,
      description: undefined,
      price: undefined,
      buttons: [],
    });
  });

  it("trims surrounding whitespace", () => {
    expect(
      parseItemCardProps({ id: " item_1 ", title: " Item title " })
    ).toMatchObject({ id: "item_1", title: "Item title" });
  });

  it("caps the length of text", () => {
    const parsed = parseItemCardProps({
      ...valid,
      description: "a".repeat(600),
    });

    expect(parsed?.description).toHaveLength(500);
  });

  it("accepts either casing for the image url", () => {
    expect(
      parseItemCardProps({ ...valid, image_url: "https://cdn.test/a.png" })
    ).toMatchObject({ imageUrl: "https://cdn.test/a.png" });
    expect(
      parseItemCardProps({ ...valid, imageUrl: "https://cdn.test/b.png" })
    ).toMatchObject({ imageUrl: "https://cdn.test/b.png" });
  });

  it.each<{ description: string; url: string }>([
    { description: "javascript", url: "javascript:alert(1)" },
    { description: "a bare path", url: "/local/a.png" },
    { description: "a non-image data url", url: "data:text/html,<script>" },
    { description: "a plain http", url: "http://cdn.test/a.png" },
  ])("drops $description image url", ({ url }) => {
    expect(parseItemCardProps({ ...valid, image_url: url })).toMatchObject({
      imageUrl: undefined,
    });
  });

  it("keeps inline images", () => {
    const url = "data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAAA==";
    expect(parseItemCardProps({ ...valid, image_url: url })).toMatchObject({
      imageUrl: url,
    });
  });

  it("drops buttons missing a label or a message", () => {
    const parsed = parseItemCardProps({
      ...valid,
      buttons: [
        { label: "Ask more", message: "Tell me more about this item" },
        { label: "No message" },
        { message: "No label" },
        "not an object",
      ],
    });

    expect(parsed?.buttons).toEqual([
      { label: "Ask more", message: "Tell me more about this item" },
    ]);
  });

  it("caps the number of buttons", () => {
    const parsed = parseItemCardProps({
      ...valid,
      buttons: Array.from({ length: 6 }, (_, i) => ({
        label: `Label ${i}`,
        message: `Message ${i}`,
      })),
    });

    expect(parsed?.buttons).toHaveLength(3);
  });

  it("ignores buttons that are not an array", () => {
    expect(
      parseItemCardProps({ ...valid, buttons: { label: "Ask more" } })
    ).toMatchObject({ buttons: [] });
  });
});
