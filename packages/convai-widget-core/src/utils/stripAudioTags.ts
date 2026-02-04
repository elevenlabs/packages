const AUDIO_TAG_PATTERN = /\[[\w\s]+\]\s*/g;

/**
 * Strips TTS emotional tags from text.
 * Tags are in format [word word] (e.g., [happy], [excited], [sad tone])
 */
export function stripAudioTags(text: string): string {
  return text.replace(AUDIO_TAG_PATTERN, "").trim();
}
