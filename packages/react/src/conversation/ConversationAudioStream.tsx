import { createContext, useContext, useMemo, useState } from "react";
import { useRegisterCallbacks } from "./ConversationContext.js";

export type ConversationAudioStreamValue = {
  inputAudioStream: MediaStream | null;
  outputAudioStream: MediaStream | null;
};

const ConversationAudioStreamContext =
  createContext<ConversationAudioStreamValue | null>(null);

/**
 * Tracks input and output audio streams exposed by the active conversation.
 * Must be rendered inside a `ConversationProvider`.
 */
export function ConversationAudioStreamProvider({
  children,
}: React.PropsWithChildren) {
  const [inputAudioStream, setInputAudioStream] =
    useState<MediaStream | null>(null);
  const [outputAudioStream, setOutputAudioStream] =
    useState<MediaStream | null>(null);

  useRegisterCallbacks({
    onInputAudioStream(stream) {
      setInputAudioStream(stream);
    },
    onOutputAudioStream(stream) {
      setOutputAudioStream(stream);
    },
    onDisconnect() {
      setInputAudioStream(null);
      setOutputAudioStream(null);
    },
  });

  const value = useMemo<ConversationAudioStreamValue>(
    () => ({
      inputAudioStream,
      outputAudioStream,
    }),
    [inputAudioStream, outputAudioStream]
  );

  return (
    <ConversationAudioStreamContext.Provider value={value}>
      {children}
    </ConversationAudioStreamContext.Provider>
  );
}

/**
 * Returns the user input and assistant output audio streams, or `null` before
 * each stream is available. Re-renders when either stream changes.
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
