import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  type Options,
  type Callbacks,
} from "@elevenlabs/client";

import {
  type HookOptions,
  type HookCallbacks,
  parseLocation,
  getOriginForLocation,
  getLivekitUrlForLocation,
} from "../index";
import { PACKAGE_VERSION } from "../version";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext";
import type { ConversationProviderProps } from "./types";

// Keys of HookCallbacks that we need to wrap with refs
const CALLBACK_KEYS: (keyof HookCallbacks)[] = [
  "onConnect",
  "onDisconnect",
  "onError",
  "onMessage",
  "onAudio",
  "onModeChange",
  "onStatusChange",
  "onCanSendFeedbackChange",
  "onDebug",
  "onUnhandledClientToolCall",
  "onVadScore",
  "onInterruption",
  "onAgentToolResponse",
  "onAgentToolRequest",
  "onConversationMetadata",
  "onMCPToolCall",
  "onMCPConnectionStatus",
  "onAsrInitiationMetadata",
  "onAgentChatResponsePart",
  "onAudioAlignment",
];

/**
 * Wraps user-provided callback props in stable ref-backed functions,
 * preventing stale closure bugs when the session outlives renders.
 */
function useStableCallbacks(props: HookOptions): Callbacks {
  // Store the latest prop value for each callback in a ref
  const callbackRefs = useRef<Partial<HookCallbacks>>({});
  for (const key of CALLBACK_KEYS) {
    callbackRefs.current[key] = props[key] as any;
  }

  // Build stable wrappers once — they always call the latest ref value
  const [stableCallbacks] = useState(() => {
    const result: Partial<Callbacks> = {};
    for (const key of CALLBACK_KEYS) {
      (result as any)[key] = (...args: any[]) => {
        const fn = callbackRefs.current[key];
        if (fn) {
          (fn as Function)(...args);
        }
      };
    }
    return result as Callbacks;
  });

  return stableCallbacks;
}

export function ConversationProvider({
  children,
  ...defaultOptions
}: ConversationProviderProps) {
  const conversationRef = useRef<Conversation | null>(null);
  const lockRef = useRef<Promise<Conversation> | null>(null);
  const shouldEndRef = useRef(false);
  const defaultOptionsRef = useRef(defaultOptions);
  defaultOptionsRef.current = defaultOptions;

  const [conversation, setConversation] = useState<Conversation | null>(null);

  const stableCallbacks = useStableCallbacks(defaultOptions);

  const startSession = useCallback(
    (options?: HookOptions) => {
      if (conversationRef.current) {
        return;
      }
      if (lockRef.current) {
        return;
      }

      shouldEndRef.current = false;

      const defaults = defaultOptionsRef.current;
      const resolvedServerLocation = parseLocation(
        options?.serverLocation || defaults?.serverLocation
      );
      const origin = getOriginForLocation(resolvedServerLocation);
      const calculatedLivekitUrl =
        getLivekitUrlForLocation(resolvedServerLocation);

      lockRef.current = Conversation.startSession({
        ...(defaults ?? {}),
        ...(options ?? {}),
        origin,
        livekitUrl:
          options?.livekitUrl || defaults?.livekitUrl || calculatedLivekitUrl,
        overrides: {
          ...(defaults?.overrides ?? {}),
          ...(options?.overrides ?? {}),
          client: {
            ...(defaults?.overrides?.client ?? {}),
            ...(options?.overrides?.client ?? {}),
            source:
              options?.overrides?.client?.source ||
              defaults?.overrides?.client?.source ||
              "react_sdk",
            version:
              options?.overrides?.client?.version ||
              defaults?.overrides?.client?.version ||
              PACKAGE_VERSION,
          },
        },
        // Wire stable callbacks — these always call the latest prop value
        ...stableCallbacks,
      } as Options);

      lockRef.current.then(
        conv => {
          if (shouldEndRef.current) {
            conv.endSession();
            lockRef.current = null;
            return;
          }
          conversationRef.current = conv;
          setConversation(conv);
          lockRef.current = null;
        },
        () => {
          lockRef.current = null;
        }
      );
    },
    [stableCallbacks]
  );

  const endSession = useCallback(() => {
    shouldEndRef.current = true;
    const pendingConnection = lockRef.current;
    const conv = conversationRef.current;
    conversationRef.current = null;
    setConversation(null);

    if (pendingConnection) {
      pendingConnection.then(c => c.endSession());
    } else {
      conv?.endSession();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldEndRef.current = true;
      if (lockRef.current) {
        lockRef.current.then(conv => conv.endSession());
      } else {
        conversationRef.current?.endSession();
      }
    };
  }, []);

  const contextValue = useMemo<ConversationContextValue>(
    () => ({ conversation, startSession, endSession }),
    [conversation, startSession, endSession]
  );

  return (
    <ConversationContext.Provider value={contextValue}>
      {children}
    </ConversationContext.Provider>
  );
}
