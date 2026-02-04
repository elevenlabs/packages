// Matches [word] or [word word] but NOT markdown links like [text](url)
// Uses negative lookahead (?!\() to avoid matching when followed by (
const AUDIO_TAG_PATTERN = /\[[\w\s]+\](?!\()\s*/g;

/**
 * Strips TTS emotional tags from text.
 * Tags are in format [word word] (e.g., [happy], [excited], [sad tone])
 * Does NOT strip markdown links like [text](url)
 */
export function stripAudioTags(text: string): string {
  return text.replace(AUDIO_TAG_PATTERN, "").trim();
}
