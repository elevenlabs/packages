const AUDIO_TAG_PATTERN = /\[[\w\s]+\](?!\()\s*/g;

/**
 * Removes expressive audio tags such as `[laughs]` or `[whispers]` from agent
 * text.
 */
export function stripAudioTags(text: string): string {
  return text.replace(AUDIO_TAG_PATTERN, "").trim();
}
