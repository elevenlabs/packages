import { signal, type ReadonlySignal } from "@preact/signals";
import type { Mode } from "@elevenlabs/client";

export const SHOW_DELAY_MS = 1000;
export const THINKING_TIMEOUT_MS = 10_000;

/** Tracks the gap in a voice call between the user's turn and the agent speaking. */
export class AgentThinking {
  private readonly thinking = signal(false);
  readonly isThinking: ReadonlySignal<boolean> = this.thinking;
  private mode: Mode = "listening";
  private awaitingReply = false;
  private pendingTools = 0;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private timeoutTimer: ReturnType<typeof setTimeout> | null = null;

  onUserTurnEnded() {
    // Tools from an earlier turn no longer matter
    this.pendingTools = 0;
    this.awaitingReply = true;
    this.start();
  }

  onToolRequest() {
    this.pendingTools++;
    this.start();
  }

  onToolResponse() {
    this.pendingTools = Math.max(0, this.pendingTools - 1);
    this.start();
  }

  onModeChange(mode: Mode) {
    this.mode = mode;
    if (mode === "speaking") {
      this.clear();
    } else if (this.pendingTools > 0) {
      this.start();
    }
  }

  onInterruption() {
    // The user is talking again, so wait for the end of their turn
    this.awaitingReply = false;
    this.clear();
  }

  reset() {
    this.pendingTools = 0;
    this.awaitingReply = false;
    this.mode = "listening";
    this.clear();
  }

  private start() {
    if (!this.awaitingReply || this.mode === "speaking") return;
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.timeoutTimer = setTimeout(() => {
      // A running tool keeps it on until the tool responds
      if (this.pendingTools === 0) this.clear();
    }, THINKING_TIMEOUT_MS);
    if (this.thinking.peek() || this.showTimer) return;
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      this.thinking.value = true;
    }, SHOW_DELAY_MS);
  }

  private clear() {
    if (this.showTimer) clearTimeout(this.showTimer);
    if (this.timeoutTimer) clearTimeout(this.timeoutTimer);
    this.showTimer = null;
    this.timeoutTimer = null;
    this.thinking.value = false;
  }
}
