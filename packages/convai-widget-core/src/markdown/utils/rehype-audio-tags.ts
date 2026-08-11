import type { Element, ElementContent, Root, RootContent, Text } from "hast";
import {
  AUDIO_TAG_CLASSNAME,
  AUDIO_TAG_PATTERN,
  parseTextWithAudioTags,
} from "../../utils/audioTags";

const SKIP_TAG_NAMES = new Set(["code", "pre"]);

function toAudioTagNodes(value: string): ElementContent[] {
  return parseTextWithAudioTags(value).map(part =>
    part.type === "audioTag"
      ? ({
          type: "element",
          tagName: "span",
          properties: { dataAudioTag: true, className: [AUDIO_TAG_CLASSNAME] },
          children: [{ type: "text", value: part.content }],
        } satisfies Element)
      : ({ type: "text", value: part.content } satisfies Text)
  );
}

function visitChildren(children: RootContent[]): void {
  const nextChildren: RootContent[] = [];
  let changed = false;

  for (const child of children) {
    if (child.type === "text" && AUDIO_TAG_PATTERN.test(child.value)) {
      changed = true;
      nextChildren.push(...toAudioTagNodes(child.value));
      continue;
    }

    if (child.type === "element" && !SKIP_TAG_NAMES.has(child.tagName)) {
      visitChildren(child.children);
    }

    nextChildren.push(child);
  }

  if (changed) {
    children.splice(0, children.length, ...nextChildren);
  }
}

/**
 * Styles `[audio tag]` markers inside already-sanitized markdown output.
 */
export function rehypeAudioTags() {
  return (tree: Root) => {
    visitChildren(tree.children);
  };
}
