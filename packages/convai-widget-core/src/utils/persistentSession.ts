import { signal, type ReadonlySignal } from "@preact/signals";
import {
  SessionConnectionError,
  type DisconnectionDetails,
  type SessionConfig,
} from "@elevenlabs/client";

const STORAGE_KEY_PREFIX = "elevenlabs_convai_persistent_session_";

// Sent by the orchestrator for an expired or unknown resume token, or a
// workspace without persistent sessions.
export const PERSISTENT_SESSION_REFUSED_CLOSE_CODE = 3000;

export function isPersistentSessionRefused(error: unknown): boolean {
  return (
    error instanceof SessionConnectionError &&
    error.closeCode === PERSISTENT_SESSION_REFUSED_CLOSE_CODE
  );
}

export function isFinalDisconnect(details: DisconnectionDetails): boolean {
  return (
    (details.reason === "agent" && details.context?.type === "end_call") ||
    (details.reason === "error" &&
      details.closeCode === PERSISTENT_SESSION_REFUSED_CLOSE_CODE)
  );
}

export function configurePersistentSession(
  config: SessionConfig,
  { resume, unavailable }: { resume: string | null; unavailable: boolean }
) {
  if (resume) {
    config.persistentSession = { token: resume };
  }
  if (!config.textOnly || unavailable) {
    delete config.persistentSession;
  } else if (config.persistentSession && config.agentId) {
    // Persistent sessions are websocket only; an agent with use_rtc would
    // otherwise route this text chat over the WebRTC data channel.
    config.connectionType = "websocket";
  }
}

function storageKey(config: SessionConfig): string | null {
  if (!config.persistentSession) return null;
  try {
    const agentId =
      config.agentId ??
      (config.signedUrl
        ? new URL(config.signedUrl).searchParams.get("agent_id")
        : null);
    if (!agentId) return null;
    // A configured user id keeps one visitor's chat from resuming for the
    // next visitor on a shared browser.
    const userSuffix = config.userId ? `_${config.userId}` : "";
    return STORAGE_KEY_PREFIX + agentId + userSuffix;
  } catch {
    return null;
  }
}

export function createStoredSession(config: ReadonlySignal<SessionConfig>) {
  const read = (): string | null => {
    try {
      const key = storageKey(config.peek());
      return key ? localStorage.getItem(key) : null;
    } catch {
      return null;
    }
  };
  // Mirrors the stored token so the UI can react to it; localStorage is not
  // reactive on its own.
  const hasStoredSession = signal(!!read());

  return {
    hasStoredSession,
    read,
    store(token: string) {
      try {
        const key = storageKey(config.peek());
        if (key) localStorage.setItem(key, token);
      } catch (error) {
        console.warn(
          "[ConversationalAI] Could not store the persistent session:",
          error
        );
      }
      hasStoredSession.value = true;
    },
    clear() {
      try {
        const key = storageKey(config.peek());
        if (key) localStorage.removeItem(key);
      } catch {
        // Nothing to clear when storage is unavailable.
      }
      hasStoredSession.value = false;
    },
  };
}
