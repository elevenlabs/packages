// Matches [word] or [word word] but NOT markdown links like [text](url)
export const AUDIO_TAG_PATTERN = /\[[\w\s]+\](?!\()/;

export const AUDIO_TAG_CLASSNAME =
  "font-medium py-px px-1 border border-audio-tag/20 rounded-button whitespace-nowrap text-audio-tag";

export interface ParsedTextPart {
  type: "text" | "audioTag";
  content: string;
}

export function parseTextWithAudioTags(text: string): ParsedTextPart[] {
  const parts: ParsedTextPart[] = [];
  const regex = new RegExp(AUDIO_TAG_PATTERN, "g");
  let lastIndex = 0;

  for (const match of text.matchAll(regex)) {
    if (match.index === undefined) {
      continue;
    }

    if (match.index > lastIndex) {
      parts.push({
        type: "text",
        content: text.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: "audioTag",
      content: match[0],
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({
      type: "text",
      content: text.slice(lastIndex),
    });
  }

  return parts;
}
