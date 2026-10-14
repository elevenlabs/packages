const WORD_PATTERN = /[\p{L}\p{N}]+/gu;

// Characters that close the word before them, revealed along with it
const CLOSING_PATTERN = /[.,!?;:…*_~`'"’”)\]]/u;

// How far ahead to look for a spoken word in the displayed text. Displayed
// words that are never spoken (link URLs, unspoken audio tags) are skipped
// over, as long as there are fewer of them than this.
const LOOKAHEAD_WORDS = 12;

type Word = { text: string; start: number; end: number };

function toWords(text: string): Word[] {
  return Array.from(text.matchAll(WORD_PATTERN), match => ({
    text: match[0].toLowerCase(),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

/**
 * Returns how much of `display` has been said once `spoken` has been heard.
 *
 * `spoken` is the text from audio alignment, which can differ from the
 * displayed markdown: markdown syntax and link URLs are not spoken, and
 * numbers or symbols may be spelled out. Words are matched in order, ignoring
 * case and punctuation, and spoken words with no match nearby are ignored so
 * the reveal never runs ahead of the speech.
 */
export function spokenTextOffset(display: string, spoken: string): number {
  const displayWords = toWords(display);
  const spokenWords = toWords(spoken);

  let nextWord = 0;
  let offset = 0;
  let endsOnCompleteWord = false;
  for (const [index, { text, end }] of spokenWords.entries()) {
    // The last spoken word may only be partly said
    const isPartial = index === spokenWords.length - 1 && end === spoken.length;
    const limit = Math.min(displayWords.length, nextWord + LOOKAHEAD_WORDS);
    for (let i = nextWord; i < limit; i++) {
      const candidate = displayWords[i];
      if (candidate.text === text) {
        nextWord = i + 1;
        offset = candidate.end;
        endsOnCompleteWord = true;
        break;
      }
      if (isPartial && candidate.text.startsWith(text)) {
        offset = Math.min(candidate.start + text.length, candidate.end);
        endsOnCompleteWord = false;
        break;
      }
    }
  }

  if (endsOnCompleteWord) {
    while (
      offset < display.length &&
      CLOSING_PATTERN.test(display[offset]) &&
      // Keep `[text](url)` hidden until the link can render as a whole
      !(display[offset] === "]" && display[offset + 1] === "(")
    ) {
      offset++;
    }
  }

  return offset;
}
