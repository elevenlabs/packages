const WORD_PATTERN = /[\p{L}\p{N}]+/gu;

// Revealed along with the word before them
const CLOSING_PATTERN = /[.,!?;:…*_~`'"’”)\]]/u;

// Lets displayed words that are never spoken, like link URLs, be skipped
const LOOKAHEAD_WORDS = 12;

type Word = { text: string; start: number; end: number };

function toWords(text: string): Word[] {
  return Array.from(text.matchAll(WORD_PATTERN), match => ({
    text: match[0].toLowerCase(),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

/** How much of `display` has been said, given the spoken alignment text. */
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
      // Keep links hidden until they can render whole
      !(display[offset] === "]" && display[offset + 1] === "(")
    ) {
      offset++;
    }
  }

  return offset;
}
