import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Conversation, type Options, type Callbacks } from "@elevenlabs/client";
import {
  CALLBACK_KEYS,
  mergeOptions,
  parseLocation,
  getOriginForLocation,
  getLivekitUrlForLocation,
} from "@elevenlabs/client/internal";

import { type HookOptions } from "./types.js";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext.js";
import { ConversationControlsProvider } from "./ConversationControls.js";
import { ConversationStatusProvider } from "./ConversationStatus.js";
import {
  ConversationInputProvider,
  type ConversationInputProviderProps,
} from "./ConversationInput.js";
import { ConversationModeProvider } from "./ConversationMode.js";
import { ConversationFeedbackProvider } from "./ConversationFeedback.js";
import {
  ConversationClientToolsProvider,
  buildClientTools,
} from "./ConversationClientTools.js";
import { ListenerMap } from "./ListenerMap.js";
import { useStableCallbacks } from "./useStableCallbacks.js";

type ConversationInputControlProps = Pick<
  ConversationInputProviderProps,
  "isMuted" | "onMutedChange"
>;

const SUB_PROVIDERS_WITHOUT_PROPS: React.ComponentType<React.PropsWithChildren>[] = [
  ConversationControlsProvider,
  ConversationStatusProvider,
  ConversationModeProvider,
  ConversationFeedbackProvider,
  ConversationClientToolsProvider,
];

export type ConversationProviderProps = React.PropsWithChildren<
  HookOptions & ConversationInputControlProps
>;

export function ConversationProvider({
  children,
  isMuted,
  onMutedChange,
  ...defaultOptions
}: ConversationProviderProps) {
  /** The active conversation instance, if any. */
  const conversationRef = useRef<Conversation | null>(null);
  /** In-flight startSession promise, used to prevent duplicate connections. */
  const lockRef = useRef<Promise<Conversation> | null>(null);
  /** Signals that endSession was called while a connection was still pending. */
  const shouldEndRef = useRef(false);
  /** Registry of hook-registered client tools. Survives across sessions. */
  const [clientToolsRegistry] = useState(
    () => new Map<string, NonNullable<Options["clientTools"]>[string]>()
  );
  /** Ref to the live clientTools object currently held by BaseConversation. */
  const clientToolsRef = useRef<Record<string, NonNullable<Options["clientTools"]>[string]>>({});
  /** Always holds the latest provider props, avoiding stale closures in callbacks. */
  const defaultOptionsRef = useRef(defaultOptions);
  // eslint-disable-next-line react-hooks/refs -- intentional sync during render for latest-ref pattern
  defaultOptionsRef.current = defaultOptions;

  /** Callback registry for sub-providers (status, mode, feedback, etc.). */
  const [listenerMap] = useState(
    () => new ListenerMap<Callbacks>(CALLBACK_KEYS)
  );

  /** Reactive mirror of conversationRef, triggers re-renders for context consumers. */
  const [conversation, setConversation] = useState<Conversation | null>(null);

  const stableCallbacks = useStableCallbacks(defaultOptions);

  const registerCallbacks = useCallback(
    (callbacks: Partial<Callbacks>) => listenerMap.register(callbacks),
    [listenerMap]
  );

  // Sync provider state when session ends externally (agent disconnect,
  // raw instance endSession(), etc.). Uses the listener map so it composes
  // with user-provided onDisconnect callbacks.
  useLayoutEffect(() => {
    return listenerMap.register({
      onDisconnect: () => {
        conversationRef.current = null;
        setConversation(null);
      },
    });
  }, [listenerMap]);

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

      const sessionOptions = mergeOptions<Options>(
        { livekitUrl: calculatedLivekitUrl },
        defaultConfig,
        stableCallbacks,
        listenerMap.compose(),
        options ?? {},
        { origin }
      );

      const clientTools = buildClientTools(
        sessionOptions.clientTools,
        clientToolsRegistry
      );
      clientToolsRef.current = clientTools;
      sessionOptions.clientTools = clientTools;

      lockRef.current = Conversation.startSession(sessionOptions);

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
        (error: unknown) => {
          lockRef.current = null;
          if (shouldEndRef.current) {
            return;
          }
          // The client SDK calls onStatusChange("disconnected") before
          // rejecting, but never calls onError — surface the failure here
          // so listeners (e.g. ConversationStatusProvider) transition to
          // the "error" state with a meaningful message.
          const message =
            error instanceof Error
              ? error.message
              : "Session failed to start";
          sessionOptions.onError?.(message, error);
        }
      );
    },
    [stableCallbacks, listenerMap, clientToolsRegistry, clientToolsRef]
  );

  const endSession = useCallback(() => {
    shouldEndRef.current = true;
    const pendingConnection = lockRef.current;
    const conv = conversationRef.current;
    conversationRef.current = null;
    setConversation(null);

    if (pendingConnection) {
      pendingConnection.then(c => c.endSession(), () => {});
    } else {
      conv?.endSession();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldEndRef.current = true;
      if (lockRef.current) {
        lockRef.current.then(conv => conv.endSession(), () => {});
      } else {
        conversationRef.current?.endSession();
      }
    };
  }, []);

  const contextValue = useMemo<ConversationContextValue>(
    () => ({
      conversation,
      conversationRef,
      startSession,
      endSession,
      registerCallbacks,
      clientToolsRegistry,
      clientToolsRef,
    }),
    [conversation, conversationRef, startSession, endSession, registerCallbacks, clientToolsRegistry, clientToolsRef]
  );

  const wrappedChildren = SUB_PROVIDERS_WITHOUT_PROPS.reduceRight<React.ReactNode>(
    (nested, Provider) => <Provider>{nested}</Provider>,
    <ConversationInputProvider
      isMuted={isMuted}
      onMutedChange={onMutedChange}
    >
      {children}
    </ConversationInputProvider>
  );

  return (
    <ConversationContext.Provider value={contextValue}>
      {wrappedChildren}
    </ConversationContext.Provider>
  );
}
