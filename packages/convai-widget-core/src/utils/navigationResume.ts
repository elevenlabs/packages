import type { Role, SessionConfig } from "@elevenlabs/client";
import type { ReadonlySignal } from "@preact/signals";

const STORAGE_KEY_PREFIX = "elevenlabs_convai_navigation_resume_";

/** How much of the previous page's conversation travels to the next one. */
export const MAX_RESUMED_TURNS = 30;

// Long enough to cover a slow page load, short enough that a visitor who
// wandered off and came back is not offered a stale conversation.
const MAX_AGE_MS = 30_000;

/** A turn worth carrying over: something said, or something the agent drew. */
export type NavigationResumeTurn =
  | { type: "message"; role: Role; message: string }
  | {
      type: "rich_content";
      component: string;
      props: unknown;
      richContentId: string;
    };

export interface NavigationResumeRecord {
  recordedAt: number;
  turns: NavigationResumeTurn[];
  micMuted: boolean;
}

function storageKey(config: SessionConfig): string | null {
  try {
    const agentId =
      config.agentId ??
      (config.signedUrl
        ? new URL(config.signedUrl).searchParams.get("agent_id")
        : null);
    if (!agentId) return null;
    // A configured user id keeps one visitor's call from being offered to the
    // next visitor on a shared browser.
    const userSuffix = config.userId ? `_${config.userId}` : "";
    return STORAGE_KEY_PREFIX + agentId + userSuffix;
  } catch {
    return null;
  }
}

function isTurn(value: unknown): value is NavigationResumeTurn {
  if (!value || typeof value !== "object") return false;
  const turn = value as Record<string, unknown>;
  if (turn.type === "rich_content") {
    return (
      typeof turn.component === "string" &&
      typeof turn.richContentId === "string"
    );
  }
  return turn.type === "message" && typeof turn.message === "string";
}

function isRecord(value: unknown): value is NavigationResumeRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<NavigationResumeRecord>;
  return (
    typeof record.recordedAt === "number" &&
    Array.isArray(record.turns) &&
    record.turns.every(isTurn) &&
    typeof record.micMuted === "boolean"
  );
}

/**
 * The call a navigation interrupted, handed to the page being loaded. Lives in
 * `sessionStorage` so it is scoped to this tab: a call should not be offered in
 * a tab the visitor just opened.
 */
export function createNavigationResumeStore(
  config: ReadonlySignal<SessionConfig>
) {
  const clear = () => {
    try {
      const key = storageKey(config.peek());
      if (key) sessionStorage.removeItem(key);
    } catch {
      // Nothing to clear when storage is unavailable.
    }
  };

  return {
    clear,
    /** Reads and removes the record, so a reload cannot offer it twice. */
    consume: (): NavigationResumeRecord | null => {
      let raw: string | null = null;
      try {
        const key = storageKey(config.peek());
        raw = key ? sessionStorage.getItem(key) : null;
      } catch {
        return null;
      }
      if (!raw) return null;
      clear();
      try {
        const parsed: unknown = JSON.parse(raw);
        if (!isRecord(parsed)) return null;
        if (Date.now() - parsed.recordedAt > MAX_AGE_MS) return null;
        return parsed;
      } catch {
        return null;
      }
    },
    store: (record: NavigationResumeRecord) => {
      try {
        const key = storageKey(config.peek());
        if (key) sessionStorage.setItem(key, JSON.stringify(record));
      } catch (error) {
        console.warn(
          "[ConversationalAI] Could not store the call for the next page:",
          error
        );
      }
    },
  };
}

/**
 * The previous page's turns, phrased for `sendContextualUpdate` so the agent
 * picks the conversation up instead of starting over.
 */
export function buildResumeContext(turns: NavigationResumeTurn[]): string {
  // Only what was said: rich content is drawn rather than spoken, so it has no
  // line in the conversation.
  const lines = turns.flatMap(turn =>
    turn.type === "message"
      ? [`${turn.role === "user" ? "User" : "You"}: ${turn.message}`]
      : []
  );
  return [
    "The page the user was on changed and this call reconnected. You are continuing the same conversation, so do not greet the user again.",
    ...(lines.length ? ["", "What was said before:", ...lines] : []),
  ].join("\n");
}
