import type { SessionConfig } from "@elevenlabs/client";

const STORAGE_KEY_PREFIX = "elevenlabs_convai_persistent_session_";

export type StoredPersistentSession = {
  conversationId: string;
  token: string;
};

export function persistentSessionStorageKey(
  config: SessionConfig
): string | null {
  if (!config.persistentSession) {
    return null;
  }
  const agentId =
    "agentId" in config && config.agentId
      ? config.agentId
      : "signedUrl" in config && config.signedUrl
        ? agentIdFromSignedUrl(config.signedUrl)
        : null;
  return agentId ? `${STORAGE_KEY_PREFIX}${agentId}` : null;
}

function agentIdFromSignedUrl(signedUrl: string): string | null {
  try {
    return new URL(signedUrl).searchParams.get("agent_id");
  } catch {
    return null;
  }
}

export function readStoredPersistentSession(
  key: string
): StoredPersistentSession | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as StoredPersistentSession).conversationId === "string" &&
      typeof (parsed as StoredPersistentSession).token === "string"
    ) {
      return parsed as StoredPersistentSession;
    }
  } catch {
    // Unavailable or corrupt storage just means there is nothing to resume.
  }
  return null;
}

export function storePersistentSession(
  key: string,
  session: StoredPersistentSession
): void {
  try {
    localStorage.setItem(key, JSON.stringify(session));
  } catch (error) {
    console.warn(
      "[ConversationalAI] Could not store the persistent session:",
      error
    );
  }
}

export function clearStoredPersistentSession(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
