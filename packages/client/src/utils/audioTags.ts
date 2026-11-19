const AUDIO_TAG = String.raw`\[[\p{L}\p{M}\p{N}_\s]+\](?!\()`;
const AUDIO_TAGS = new RegExp(AUDIO_TAG, "gu");
// Captured so that `split` returns [text, run, text, run, ..., text].
const AUDIO_TAG_RUN = new RegExp(
  String.raw`([\p{Zs}\t]*(?:${AUDIO_TAG}[\p{Zs}\t]*)+)`,
  "u"
);
const ENDS_LINE = /(?:^|\s)$/u;
const STARTS_LINE = /^(?:\s|$)/u;
const ENDS_WITH_OPENING = /[\p{Ps}\p{Pi}]$/u;
const STARTS_WITH_CLOSING = /^[\p{Terminal_Punctuation}\p{Pe}\p{Pf}]/u;

function separator(before: string, run: string, after: string): string {
  if (ENDS_LINE.test(before) || STARTS_LINE.test(after)) return "";
  if (run.replace(AUDIO_TAGS, "") === "") return "";
  if (run.startsWith("[") && ENDS_WITH_OPENING.test(before)) return "";
  if (run.endsWith("]") && STARTS_WITH_CLOSING.test(after)) return "";
  return " ";
}

/**
 * Removes expressive audio tags such as `[laughs]`, `[whispers]` or `[차분]`
 * from agent text. Tags may be written in any language.
 */
export function stripAudioTags(text: string): string {
  const parts = text.split(AUDIO_TAG_RUN);
  let result = parts[0];
  for (let i = 1; i < parts.length; i += 2) {
    result += separator(parts[i - 1], parts[i], parts[i + 1]) + parts[i + 1];
  }
  return result.trim();
}
