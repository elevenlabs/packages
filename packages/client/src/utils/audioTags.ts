const AUDIO_TAG_PATTERN = /\[[\p{L}\p{M}\p{N}_\s]+\](?!\()/gu;

/**
 * Removes expressive audio tags such as `[laughs]`, `[whispers]` or `[차분]`
 * from agent text. Tags may be written in any language.
 */
export function stripAudioTags(text: string): string {
  return text.replace(AUDIO_TAG_PATTERN, "").trim();
}
