import type { SessionConfig } from "@elevenlabs/client";

const STORAGE_KEY_PREFIX = "elevenlabs_convai_persistent_session_";

function storageKey(config: SessionConfig): string | null {
  if (!config.persistentSession) return null;
  try {
    const agentId =
      config.agentId ??
      (config.signedUrl
        ? new URL(config.signedUrl).searchParams.get("agent_id")
        : null);
    return agentId ? STORAGE_KEY_PREFIX + agentId : null;
  } catch {
    return null;
  }
}

export function readStoredPersistentSession(
  config: SessionConfig
): string | null {
  try {
    const key = storageKey(config);
    return key ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

export function storePersistentSession(config: SessionConfig, token: string) {
  try {
    const key = storageKey(config);
    if (key) localStorage.setItem(key, token);
  } catch (error) {
    console.warn(
      "[ConversationalAI] Could not store the persistent session:",
      error
    );
  }
}

export function clearStoredPersistentSession(config: SessionConfig) {
  try {
    const key = storageKey(config);
    if (key) localStorage.removeItem(key);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
