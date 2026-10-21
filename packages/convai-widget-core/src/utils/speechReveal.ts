import type { Signal } from "@preact/signals";
import type { AudioAlignmentEvent, Mode } from "@elevenlabs/client";
import type { TranscriptEntry } from "../contexts/conversation";
import { spokenTextOffset } from "./spokenTextOffset";

// How long after speech stops to show the rest of a reveal that fell behind
export const SETTLE_MS = 1000;
// Show a message in full if none of its audio starts playing in this time
export const PENDING_TIMEOUT_MS = 3000;

type Turn = {
  spoken: string;
  queue: { at: number; char: string }[];
  state: "pending" | "revealing" | "interrupted" | "done";
  /** Across the turn's messages; never shrinks */
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

/** Reveals voice agent messages in step with their audio as it plays. */
export class SpeechReveal {
  private alignmentAvailable = false;
  private mode: Mode = "listening";
  private readonly turns = new Map<number, Turn>();
  private tickTimer: ReturnType<typeof setTimeout> | null = null;
  private settleTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly transcript: Signal<TranscriptEntry[]>) {}

  onAlignmentReceived() {
    this.alignmentAvailable = true;
  }

  onAlignmentPlayback(eventId: number, alignment: AudioAlignmentEvent) {
    this.alignmentAvailable = true;
    let turn = this.turns.get(eventId);
    if (!turn) {
      // Already shown in full
      if (this.messageIndices(eventId).length > 0) {
        this.createTurn(eventId, "done");
        return;
      }
      turn = this.createTurn(eventId, "revealing");
    }
    if (turn.state === "interrupted") return;
    if (turn.state === "done") {
      // Unless shown in full, a later message whose audio came first
      if (turn.entryCount === 0) return;
      turn.awaitingMessage = true;
    }

    this.clearPendingTimer(turn);
    turn.state = "revealing";
    const start = Date.now();
    alignment.chars.forEach((char, index) => {
      turn.queue.push({
        at: start + (alignment.char_start_times_ms[index] ?? 0),
        char,
      });
    });
    this.scheduleTick();
  }

  onAgentMessage(eventId: number) {
    if (!this.alignmentAvailable) return;
    const entryCount = this.messageIndices(eventId).length;
    const turn = this.turns.get(eventId) ?? this.createTurn(eventId, "pending");
    // A later message of the turn, e.g. after a tool call
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
      this.armPendingTimer(eventId, turn);
    }
    this.apply(eventId);
  }

  onModeChange(mode: Mode) {
    this.mode = mode;
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.settleTimer =
      mode === "listening" ? setTimeout(() => this.settle(), SETTLE_MS) : null;
  }

  onInterruption(eventId: number) {
    for (const [turnEventId, turn] of this.turns) {
      if (
        turnEventId < eventId &&
        (turn.state === "pending" || turn.state === "revealing")
      ) {
        this.clearPendingTimer(turn);
        turn.queue = [];
        turn.state = "interrupted";
        this.apply(turnEventId);
      }
    }
  }

  finishAll() {
    for (const [eventId, turn] of this.turns) {
      if (turn.state === "pending" || turn.state === "revealing") {
        this.finish(eventId, turn);
      }
    }
  }

  reset() {
    this.clearTimers();
    this.turns.clear();
    this.alignmentAvailable = false;
    this.mode = "listening";
  }

  private messageIndices(eventId: number) {
    return this.transcript
      .peek()
      .flatMap((entry, index) =>
        isVoiceAgentMessage(entry, eventId) ? [index] : []
      );
  }

  private createTurn(eventId: number, state: Turn["state"]): Turn {
    const turn: Turn = {
      spoken: "",
      queue: [],
      state,
      revealed: 0,
      entryCount: 0,
      awaitingMessage: false,
    };
    this.turns.set(eventId, turn);
    return turn;
  }

  private clearPendingTimer(turn: Turn) {
    if (turn.pendingTimer) {
      clearTimeout(turn.pendingTimer);
      turn.pendingTimer = undefined;
    }
  }

  private armPendingTimer(eventId: number, turn: Turn) {
    this.clearPendingTimer(turn);
    turn.pendingTimer = setTimeout(() => {
      turn.pendingTimer = undefined;
      if (turn.state !== "pending") return;
      // Earlier audio may still be playing
      if (this.mode === "speaking") {
        this.armPendingTimer(eventId, turn);
        return;
      }
      this.finish(eventId, turn);
    }, PENDING_TIMEOUT_MS);
  }

  private finish(eventId: number, turn: Turn) {
    this.clearPendingTimer(turn);
    turn.queue = [];
    turn.state = "done";
    turn.awaitingMessage = false;
    this.apply(eventId);
  }

  private apply(eventId: number) {
    const turn = this.turns.get(eventId);
    const entries = this.transcript.peek();
    const indices = this.messageIndices(eventId);
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
        this.clearPendingTimer(turn);
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
      const visibleLength =
        remaining === undefined
          ? undefined
          : Math.min(remaining, entry.message.length);
      if (remaining !== undefined) {
        remaining = Math.max(0, remaining - entry.message.length - 1);
      }
      if (
        entry.visibleLength !== visibleLength ||
        entry.speechInterrupted !== speechInterrupted
      ) {
        updated ??= [...entries];
        updated[index] = { ...entry, visibleLength, speechInterrupted };
      }
    }
    if (updated) {
      this.transcript.value = updated;
    }
  }

  private tick() {
    this.tickTimer = null;
    const now = Date.now();
    let nextAt = Infinity;
    for (const [eventId, turn] of this.turns) {
      let heard = 0;
      while (heard < turn.queue.length && turn.queue[heard].at <= now) {
        turn.spoken += turn.queue[heard].char;
        heard++;
      }
      if (heard > 0) {
        turn.queue.splice(0, heard);
        this.apply(eventId);
      }
      if (turn.queue.length > 0) {
        nextAt = Math.min(nextAt, turn.queue[0].at);
      }
    }
    if (nextAt !== Infinity) {
      this.tickTimer = setTimeout(
        () => this.tick(),
        Math.max(0, nextAt - Date.now())
      );
    }
  }

  private scheduleTick() {
    if (this.tickTimer) clearTimeout(this.tickTimer);
    this.tickTimer = setTimeout(() => this.tick(), 0);
  }

  private settle() {
    this.settleTimer = null;
    for (const [eventId, turn] of this.turns) {
      if (turn.state === "revealing" && turn.queue.length === 0) {
        this.finish(eventId, turn);
      }
    }
  }

  private clearTimers() {
    if (this.tickTimer) clearTimeout(this.tickTimer);
    if (this.settleTimer) clearTimeout(this.settleTimer);
    this.tickTimer = null;
    this.settleTimer = null;
    for (const turn of this.turns.values()) {
      this.clearPendingTimer(turn);
    }
  }
}
