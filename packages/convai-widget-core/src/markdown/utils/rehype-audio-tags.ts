import { splitAudioTags, type AudioTagPart } from "@elevenlabs/client";
import type { Element, ElementContent, Root, RootContent, Text } from "hast";

const AUDIO_TAG_CLASSNAME =
  "font-medium py-px px-1 border border-audio-tag/20 rounded-button whitespace-nowrap text-audio-tag";

const SKIP_TAG_NAMES = new Set(["code", "pre"]);

function toAudioTagNodes(parts: AudioTagPart[]): ElementContent[] {
  return parts.map(part =>
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
    if (child.type === "text") {
      const parts = splitAudioTags(child.value);
      if (parts.some(part => part.type === "audioTag")) {
        changed = true;
        nextChildren.push(...toAudioTagNodes(parts));
        continue;
      }
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
