const AUDIO_TAG = String.raw`\[[\p{L}\p{M}\p{N}_\s]+\](?!\()`;
const AUDIO_TAG_PATTERN = new RegExp(AUDIO_TAG, "gu");
const AUDIO_TAG_RUN = new RegExp(
  String.raw`(?<![\p{Zs}\t])[\p{Zs}\t]*(?:${AUDIO_TAG}[\p{Zs}\t]*)+`,
  "gu"
);
const CLOSING = /[\p{Terminal_Punctuation}\p{Pe}\p{Pf}]/u;
const OPENING = /[\p{Ps}\p{Pi}]/u;
const WHITESPACE = /\s/u;

function charBefore(text: string, index: number): string | undefined {
  return [...text.slice(Math.max(0, index - 2), index)].at(-1);
}

function charAt(text: string, index: number): string | undefined {
  const codePoint = text.codePointAt(index);
  return codePoint === undefined ? undefined : String.fromCodePoint(codePoint);
}

function joinAround(run: string, before?: string, after?: string): string {
  if (!before || !after) return "";
  if (WHITESPACE.test(before) || WHITESPACE.test(after)) return "";
  if (!WHITESPACE.test(run.replace(AUDIO_TAG_PATTERN, ""))) return "";
  if (!WHITESPACE.test(run.at(-1)!) && CLOSING.test(after)) return "";
  if (!WHITESPACE.test(run[0]) && OPENING.test(before)) return "";
  return " ";
}

export function stripAudioTags(text: string): string {
  return text
    .replace(AUDIO_TAG_RUN, (run: string, offset: number) =>
      joinAround(
        run,
        charBefore(text, offset),
        charAt(text, offset + run.length)
      )
    )
    .trim();
}
