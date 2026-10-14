import type { Signal } from "@preact/signals";
import type { AudioAlignmentEvent, Mode } from "@elevenlabs/client";
import type { TranscriptEntry } from "../contexts/conversation";
import { spokenTextOffset } from "./spokenTextOffset";

// After the agent stops speaking, wait this long before showing the rest of
// a reveal that fell behind the speech, in case playback only briefly stalled
export const SETTLE_MS = 1000;
// Show a message in full if none of its audio starts playing in this time
export const PENDING_TIMEOUT_MS = 3000;

type Turn = {
  spoken: string;
  queue: { at: number; char: string }[];
  state: "pending" | "revealing" | "interrupted" | "done";
  /** Revealed length across the turn's messages; it never shrinks */
  revealed: number;
  entryCount: number;
  /** Audio started for a message of the turn that has not arrived yet */
  awaitingMessage: boolean;
  pendingTimer?: ReturnType<typeof setTimeout>;
};

type VoiceAgentMessage = Extract<TranscriptEntry, { type: "message" }>;

function isVoiceAgentMessage(
  entry: TranscriptEntry,
  eventId: number
): entry is VoiceAgentMessage {
  return (
    entry.type === "message" &&
    entry.role === "agent" &&
    !entry.isText &&
    entry.eventId === eventId
  );
}

/**
 * Reveals voice agent messages in step with their audio, using the
 * character alignment of each audio chunk as it starts playing. Until the
 * session receives any alignment, messages are shown in full.
 */
export function createSpeechReveal(transcript: Signal<TranscriptEntry[]>) {
  let alignmentAvailable = false;
  let mode: Mode = "listening";
  const turns = new Map<number, Turn>();
  let tickTimer: ReturnType<typeof setTimeout> | null = null;
  let settleTimer: ReturnType<typeof setTimeout> | null = null;

  const messageIndices = (eventId: number) =>
    transcript
      .peek()
      .flatMap((entry, index) =>
        isVoiceAgentMessage(entry, eventId) ? [index] : []
      );

  const createTurn = (eventId: number, state: Turn["state"]): Turn => {
    const turn: Turn = {
      spoken: "",
      queue: [],
      state,
      revealed: 0,
      entryCount: 0,
      awaitingMessage: false,
    };
    turns.set(eventId, turn);
    return turn;
  };

  const clearPendingTimer = (turn: Turn) => {
    if (turn.pendingTimer) {
      clearTimeout(turn.pendingTimer);
      turn.pendingTimer = undefined;
    }
  };

  const armPendingTimer = (eventId: number, turn: Turn) => {
    clearPendingTimer(turn);
    turn.pendingTimer = setTimeout(() => {
      turn.pendingTimer = undefined;
      if (turn.state !== "pending") return;
      // Audio is still playing, possibly ahead of this turn's audio
      if (mode === "speaking") {
        armPendingTimer(eventId, turn);
        return;
      }
      finish(eventId, turn);
    }, PENDING_TIMEOUT_MS);
  };

  const finish = (eventId: number, turn: Turn) => {
    clearPendingTimer(turn);
    turn.queue = [];
    turn.state = "done";
    turn.awaitingMessage = false;
    apply(eventId);
  };

  const apply = (eventId: number) => {
    const turn = turns.get(eventId);
    const entries = transcript.peek();
    const indices = messageIndices(eventId);
    if (!turn || indices.length === 0) return;

    const display = indices
      .map(index => (entries[index] as VoiceAgentMessage).message)
      .join("\n");
    if (turn.state === "done") {
      turn.revealed = display.length;
    } else {
      turn.revealed = Math.max(
        turn.revealed,
        spokenTextOffset(display, turn.spoken)
      );
      if (
        turn.state !== "interrupted" &&
        !turn.awaitingMessage &&
        turn.revealed >= display.trimEnd().length
      ) {
        clearPendingTimer(turn);
        turn.queue = [];
        turn.state = "done";
        turn.revealed = display.length;
      }
    }

    let remaining = turn.state === "done" ? undefined : turn.revealed;
    const speechInterrupted = turn.state === "interrupted" || undefined;
    let updated: TranscriptEntry[] | null = null;
    for (const index of indices) {
      const entry = entries[index] as VoiceAgentMessage;
      const revealedLength =
        remaining === undefined
          ? undefined
          : Math.min(remaining, entry.message.length);
      if (remaining !== undefined) {
        remaining = Math.max(0, remaining - entry.message.length - 1);
      }
      if (
        entry.revealedLength !== revealedLength ||
        entry.speechInterrupted !== speechInterrupted
      ) {
        updated ??= [...entries];
        updated[index] = { ...entry, revealedLength, speechInterrupted };
      }
    }
    if (updated) {
      transcript.value = updated;
    }
  };

  const tick = () => {
    tickTimer = null;
    const now = Date.now();
    let nextAt = Infinity;
    for (const [eventId, turn] of turns) {
      let heard = 0;
      while (heard < turn.queue.length && turn.queue[heard].at <= now) {
        turn.spoken += turn.queue[heard].char;
        heard++;
      }
      if (heard > 0) {
        turn.queue.splice(0, heard);
        apply(eventId);
      }
      if (turn.queue.length > 0) {
        nextAt = Math.min(nextAt, turn.queue[0].at);
      }
    }
    if (nextAt !== Infinity) {
      tickTimer = setTimeout(tick, Math.max(0, nextAt - Date.now()));
    }
  };

  const scheduleTick = () => {
    if (tickTimer) clearTimeout(tickTimer);
    tickTimer = setTimeout(tick, 0);
  };

  const settle = () => {
    settleTimer = null;
    for (const [eventId, turn] of turns) {
      if (turn.state === "revealing" && turn.queue.length === 0) {
        finish(eventId, turn);
      }
    }
  };

  const clearTimers = () => {
    if (tickTimer) clearTimeout(tickTimer);
    if (settleTimer) clearTimeout(settleTimer);
    tickTimer = null;
    settleTimer = null;
    for (const turn of turns.values()) {
      clearPendingTimer(turn);
    }
  };

  return {
    onAlignmentReceived() {
      alignmentAvailable = true;
    },

    onAlignmentPlayback(eventId: number, alignment: AudioAlignmentEvent) {
      alignmentAvailable = true;
      let turn = turns.get(eventId);
      if (!turn) {
        // The message is already shown in full, so leave it be
        if (messageIndices(eventId).length > 0) {
          createTurn(eventId, "done");
          return;
        }
        turn = createTurn(eventId, "revealing");
      }
      if (turn.state === "interrupted") return;
      if (turn.state === "done") {
        // Shown in full without a reveal; otherwise this is a later message
        // of the turn whose audio started before it arrived
        if (turn.entryCount === 0) return;
        turn.awaitingMessage = true;
      }

      clearPendingTimer(turn);
      turn.state = "revealing";
      const start = Date.now();
      alignment.chars.forEach((char, index) => {
        turn.queue.push({
          at: start + (alignment.char_start_times_ms[index] ?? 0),
          char,
        });
      });
      scheduleTick();
    },

    onAgentMessage(eventId: number) {
      if (!alignmentAvailable) return;
      const entryCount = messageIndices(eventId).length;
      const turn = turns.get(eventId) ?? createTurn(eventId, "pending");
      // A new message for a turn whose earlier message was fully said, e.g.
      // after a tool call
      if (
        turn.state === "done" &&
        turn.entryCount > 0 &&
        entryCount > turn.entryCount
      ) {
        turn.state = "pending";
      }
      if (entryCount > turn.entryCount) {
        turn.awaitingMessage = false;
      }
      turn.entryCount = entryCount;
      if (turn.state === "pending" && !turn.pendingTimer) {
        armPendingTimer(eventId, turn);
      }
      apply(eventId);
    },

    onModeChange(newMode: Mode) {
      mode = newMode;
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = mode === "listening" ? setTimeout(settle, SETTLE_MS) : null;
    },

    /** Keeps only what was said of turns before the interruption. */
    onInterruption(eventId: number) {
      for (const [turnEventId, turn] of turns) {
        if (
          turnEventId < eventId &&
          (turn.state === "pending" || turn.state === "revealing")
        ) {
          clearPendingTimer(turn);
          turn.queue = [];
          turn.state = "interrupted";
          apply(turnEventId);
        }
      }
    },

    /** Shows the rest of every turn that was not interrupted. */
    finishAll() {
      for (const [eventId, turn] of turns) {
        if (turn.state === "pending" || turn.state === "revealing") {
          finish(eventId, turn);
        }
      }
    },

    reset() {
      clearTimers();
      turns.clear();
      alignmentAvailable = false;
      mode = "listening";
    },
  };
}

export type SpeechReveal = ReturnType<typeof createSpeechReveal>;
