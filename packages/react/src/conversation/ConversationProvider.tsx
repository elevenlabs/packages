import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Conversation,
  mergeOptions,
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
import { ConversationControlsProvider } from "./ConversationControls";
import { ConversationStatusProvider } from "./ConversationStatus";
import { ConversationInputProvider } from "./ConversationInput";
import { ConversationModeProvider } from "./ConversationMode";
import { ListenerMap } from "./ListenerMap";
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
  const callbackRefs = useRef<Record<string, unknown>>({});
  for (const key of CALLBACK_KEYS) {
    // eslint-disable-next-line react-hooks/refs -- intentional sync during render for latest-ref pattern
    callbackRefs.current[key] = props[key];
  }

  // Build stable wrappers once — they always call the latest ref value
  const [stableCallbacks] = useState(() => {
    const result: Partial<Callbacks> = {};
    for (const key of CALLBACK_KEYS) {
      result[key] = (
        ...args: Parameters<NonNullable<Callbacks[typeof key]>>
      ) => {
        const fn = callbackRefs.current[key] as
          | ((...args: Parameters<NonNullable<Callbacks[typeof key]>>) => void)
          | undefined;
        fn?.(...args);
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
  /** The active conversation instance, if any. */
  const conversationRef = useRef<Conversation | null>(null);
  /** In-flight startSession promise, used to prevent duplicate connections. */
  const lockRef = useRef<Promise<Conversation> | null>(null);
  /** Signals that endSession was called while a connection was still pending. */
  const shouldEndRef = useRef(false);
  /** Always holds the latest provider props, avoiding stale closures in callbacks. */
  const defaultOptionsRef = useRef(defaultOptions);
  // eslint-disable-next-line react-hooks/refs -- intentional sync during render for latest-ref pattern
  defaultOptionsRef.current = defaultOptions;

  /** Callback registry for sub-providers (status, mode, feedback, etc.). */
  const listenerMapRef = useRef(new ListenerMap<Callbacks>());

  /** Reactive mirror of conversationRef, triggers re-renders for context consumers. */
  const [conversation, setConversation] = useState<Conversation | null>(null);

  const stableCallbacks = useStableCallbacks(defaultOptions);

  const registerCallbacks = useCallback(
    (callbacks: Partial<Callbacks>) => listenerMapRef.current.register(callbacks),
    []
  );

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
      const calculatedLivekitUrl = getLivekitUrlForLocation(
        resolvedServerLocation
      );

      // Strip raw callbacks from defaults — stableCallbacks provides
      // ref-backed versions that won't go stale across renders.
      const defaultConfig = { ...defaults };
      for (const key of CALLBACK_KEYS) {
        delete (defaultConfig as Record<string, unknown>)[key];
      }

      lockRef.current = Conversation.startSession(
        mergeOptions<Options>(
          { livekitUrl: calculatedLivekitUrl },
          defaultConfig,
          stableCallbacks,
          listenerMapRef.current.compose(),
          options ?? {},
          {
            origin,
            overrides: {
              client: { source: "react_sdk", version: PACKAGE_VERSION },
            },
          }
        )
      );

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
    () => ({ conversation, startSession, endSession, registerCallbacks }),
    [conversation, startSession, endSession, registerCallbacks]
  );

  return (
    <ConversationContext.Provider value={contextValue}>
      <ConversationControlsProvider>
        <ConversationStatusProvider>
          <ConversationInputProvider>
            <ConversationModeProvider>{children}</ConversationModeProvider>
          </ConversationInputProvider>
        </ConversationStatusProvider>
      </ConversationControlsProvider>
    </ConversationContext.Provider>
  );
}
