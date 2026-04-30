import { createContext, useContext, useMemo, useState } from "react";
import { useRegisterCallbacks } from "./ConversationContext.js";

export type ConversationAudioStreamValue = {
  audioStream: MediaStream | null;
};

const ConversationAudioStreamContext =
  createContext<ConversationAudioStreamValue | null>(null);

/**
 * Tracks the assistant output audio stream exposed by the active conversation.
 * Must be rendered inside a `ConversationProvider`.
 */
export function ConversationAudioStreamProvider({
  children,
}: React.PropsWithChildren) {
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);

  useRegisterCallbacks({
    onAudioStream(stream) {
      setAudioStream(stream);
    },
    onDisconnect() {
      setAudioStream(null);
    },
  });

  const value = useMemo<ConversationAudioStreamValue>(
    () => ({
      audioStream,
    }),
    [audioStream]
  );

  return (
    <ConversationAudioStreamContext.Provider value={value}>
      {children}
    </ConversationAudioStreamContext.Provider>
  );
}

/**
 * Returns the assistant output audio stream, or `null` before a stream is
 * available. Re-renders when the stream changes.
 *
 * Must be used within a `ConversationProvider`.
 */
export function useConversationAudioStream(): ConversationAudioStreamValue {
  const ctx = useContext(ConversationAudioStreamContext);
  if (!ctx) {
    throw new Error(
      "useConversationAudioStream must be used within a ConversationProvider"
    );
  }
  return ctx;
}
