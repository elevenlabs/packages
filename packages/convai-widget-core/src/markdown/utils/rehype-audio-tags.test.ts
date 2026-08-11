import type { Element, Root, Text } from "hast";
import { describe, expect, it } from "vitest";
import { rehypeAudioTags } from "./rehype-audio-tags";

function text(value: string): Text {
  return { type: "text", value };
}

function element(tagName: string, children: Element["children"]): Element {
  return { type: "element", tagName, properties: {}, children };
}

function root(children: Root["children"]): Root {
  return { type: "root", children };
}

describe("rehypeAudioTags", () => {
  it("wraps an audio tag in a styled span", () => {
    const tree = root([element("p", [text("Hello [laughs] world")])]);

    rehypeAudioTags()(tree);

    const paragraph = tree.children[0] as Element;
    expect(paragraph.children).toEqual([
      text("Hello "),
      expect.objectContaining({
        type: "element",
        tagName: "span",
        properties: expect.objectContaining({ dataAudioTag: true }),
        children: [text("[laughs]")],
      }),
      text(" world"),
    ]);
  });

  it("does not style audio tag syntax inside code blocks", () => {
    const tree = root([element("code", [text("format: [happy]")])]);

    rehypeAudioTags()(tree);

    const code = tree.children[0] as Element;
    expect(code.children).toEqual([text("format: [happy]")]);
  });

  it("styles audio tags nested inside inline elements", () => {
    const tree = root([
      element("p", [element("strong", [text("[excited] Great news!")])]),
    ]);

    rehypeAudioTags()(tree);

    const paragraph = tree.children[0] as Element;
    const strong = paragraph.children[0] as Element;
    expect(strong.children[0]).toMatchObject({
      type: "element",
      tagName: "span",
      children: [text("[excited]")],
    });
  });
});
