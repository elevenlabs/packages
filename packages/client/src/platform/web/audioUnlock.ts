import { isIosDevice } from "./compatibility.js";

const STASH_TTL_MS = 30_000;
const UNLOCK_EVENTS = ["touchstart", "touchend", "click"] as const;

let stashedAudioContext: AudioContext | null = null;
let discardTimer: ReturnType<typeof setTimeout> | null = null;
let unlockListenerInstalled = false;

function unlockAudioContext(ctx: AudioContext): void {
  const buffer = ctx.createBuffer(1, 1, 22050);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);
  void ctx.resume().catch(() => {});
}

function scheduleStashDiscard(): void {
  if (discardTimer) {
    clearTimeout(discardTimer);
  }
  discardTimer = setTimeout(() => {
    discardTimer = null;
    discardStashedAudioContext();
  }, STASH_TTL_MS);
}

function clearStashDiscardTimer(): void {
  if (!discardTimer) {
    return;
  }
  clearTimeout(discardTimer);
  discardTimer = null;
}

/** Unlock iOS audio during a user gesture. No-op on non-iOS. */
export function unlockIosAudioForSession(): void {
  if (!isIosDevice() || stashedAudioContext) {
    return;
  }

  const ctx = new AudioContext();
  unlockAudioContext(ctx);
  stashedAudioContext = ctx;
  scheduleStashDiscard();
}

/**
 * Listen for the first user interaction on the page and unlock iOS audio in
 * the capture phase, before application click handlers run. Covers callers
 * (such as the convai widget) that `await` before `Conversation.startSession`.
 */
export function installIosAudioUnlockListener(): void {
  if (
    !isIosDevice() ||
    unlockListenerInstalled ||
    typeof document === "undefined"
  ) {
    return;
  }

  unlockListenerInstalled = true;
  const onUserGesture = () => {
    unlockIosAudioForSession();
  };

  for (const event of UNLOCK_EVENTS) {
    document.addEventListener(event, onUserGesture, true);
  }
}

export function takeUnlockedAudioContext(): AudioContext | null {
  const ctx = stashedAudioContext;
  stashedAudioContext = null;
  clearStashDiscardTimer();
  return ctx;
}

export function discardStashedAudioContext(): void {
  if (!stashedAudioContext) {
    return;
  }
  void stashedAudioContext.close().catch(() => {});
  stashedAudioContext = null;
  clearStashDiscardTimer();
}
