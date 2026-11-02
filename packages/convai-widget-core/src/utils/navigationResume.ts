import {
  SessionConnectionError,
  type DisconnectionDetails,
  type Role,
  type SessionConfig,
} from "@elevenlabs/client";
import { signal, type ReadonlySignal } from "@preact/signals";
import type { TranscriptEntry } from "../contexts/conversation";

const STORAGE_KEY_PREFIX = "elevenlabs_convai_navigation_resume_";

const MAX_RESUMED_TURNS = 30;

// Long enough to read a page, short enough not to offer a stale call.
const MAX_AGE_MS = 2 * 60_000;

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
  conversationId?: string;
}

function storageKey(config: SessionConfig): string | null {
  try {
    const agentId =
      config.agentId ??
      (config.signedUrl
        ? new URL(config.signedUrl).searchParams.get("agent_id")
        : null);
    if (!agentId) return null;
    // Keeps a call from being offered to the next user on a shared browser.
    const userSuffix = config.userId ? `_${config.userId}` : "";
    return STORAGE_KEY_PREFIX + agentId + userSuffix;
  } catch {
    return null;
  }
}

export function isFirstMessageOverrideRefused(
  cause: SessionConnectionError | DisconnectionDetails | unknown
): boolean {
  let reason: string | undefined;
  if (cause instanceof SessionConnectionError) {
    reason = cause.closeReason;
  } else if ((cause as DisconnectionDetails | undefined)?.reason === "error") {
    const details = cause as Extract<DisconnectionDetails, { reason: "error" }>;
    reason = details.closeReason ?? details.message;
  }
  return !!reason?.includes("Override for field 'first_message'");
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
    typeof record.micMuted === "boolean" &&
    (record.conversationId === undefined ||
      typeof record.conversationId === "string")
  );
}

/** Per tab, so a newly opened tab is never offered the call. */
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

  // Reads and removes the record, so it is only ever offered by one page.
  const consume = (): NavigationResumeRecord | null => {
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
  };

  const store = (record: NavigationResumeRecord) => {
    try {
      const key = storageKey(config.peek());
      if (key) sessionStorage.setItem(key, JSON.stringify(record));
    } catch (error) {
      console.warn(
        "[ConversationalAI] Could not store the call for the next page:",
        error
      );
    }
  };

  // Kept until the continued call connects, so a failed start can retry.
  const pending = signal(config.peek().persistentSession ? consume() : null);
  const shownAt = Date.now();

  return {
    pending,
    clear,
    save: (
      transcript: TranscriptEntry[],
      details: { micMuted: boolean; conversationId: string }
    ) =>
      store({
        recordedAt: Date.now(),
        turns: toResumeTurns(transcript),
        ...details,
      }),
    /** An untaken offer carries on, aging from when this page showed it. */
    carryOver: () => {
      const record = pending.peek();
      if (record) store({ ...record, recordedAt: shownAt });
    },
  };
}

function toResumeTurns(transcript: TranscriptEntry[]): NavigationResumeTurn[] {
  return transcript
    .flatMap((entry): NavigationResumeTurn[] => {
      if (entry.type === "message" && entry.message.trim()) {
        return [{ type: "message", role: entry.role, message: entry.message }];
      }
      if (entry.type === "rich_content") {
        return [
          {
            type: "rich_content",
            component: entry.component,
            props: entry.props,
            richContentId: entry.richContentId,
          },
        ];
      }
      return [];
    })
    .slice(-MAX_RESUMED_TURNS);
}

export function toTranscriptEntries(
  { turns }: NavigationResumeRecord,
  conversationIndex: number
): TranscriptEntry[] {
  return turns.map(
    (turn): TranscriptEntry =>
      turn.type === "rich_content"
        ? {
            type: "rich_content",
            component: turn.component,
            props: turn.props,
            richContentId: turn.richContentId,
            // No turn speaks under 0, so the card is never held back.
            eventId: 0,
            conversationIndex,
          }
        : {
            type: "message",
            role: turn.role,
            message: turn.message,
            isText: false,
            conversationIndex,
          }
  );
}

export function buildResumeContext(turns: NavigationResumeTurn[]): string {
  // Rich content isn't spoken, so it has no line here.
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
