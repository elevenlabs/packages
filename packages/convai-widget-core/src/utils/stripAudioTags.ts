import { AUDIO_TAG_PATTERN } from "./audioTags";

/**
 * Strips TTS emotional tags from text.
 * Tags are in format [word word] (e.g., [happy], [excited], [sad tone])
 * Does NOT strip markdown links like [text](url)
 */
export function stripAudioTags(text: string): string {
  return text
    .replace(new RegExp(`${AUDIO_TAG_PATTERN.source}\\s*`, "g"), "")
    .trim();
}
