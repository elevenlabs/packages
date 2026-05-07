import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Conversation,
  type Options,
  type Callbacks,
  type ConversationLifecycleOptions,
} from "@elevenlabs/client";
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
  /** Monotonic id used to ignore stale async handlers from older starts. */
  const startSessionIdRef = useRef(0);
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

  /** Reactive mirror of conversationRef, triggers re-renders for context consumers. */
  const [conversation, setConversation] = useState<Conversation | null>(null);
  /** True while a `startSession` call is in progress. */
  const [isStarting, setIsStarting] = useState(false);
  /** Error message from a failed `startSession` call. Cleared on next attempt. */
  const [startupError, setStartupError] = useState<string | null>(null);

  const stableCallbacks = useStableCallbacks(defaultOptions);

  // Sync provider state when session ends externally (agent disconnect,
  // raw instance endSession(), etc.).
  useEffect(() => {
    if (!conversation) return;
    return conversation.on("disconnect", () => {
      conversationRef.current = null;
      setConversation(null);
    });
  }, [conversation]);

  const startSession = useCallback(
    (options?: HookOptions) => {
      if (conversationRef.current) {
        return;
      }
      if (lockRef.current) {
        return;
      }

      shouldEndRef.current = false;
      setIsStarting(true);
      setStartupError(null);
      const startSessionId = ++startSessionIdRef.current;

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
        options ?? {},
        { origin }
      );

      const clientTools = buildClientTools(
        sessionOptions.clientTools,
        clientToolsRegistry
      );
      clientToolsRef.current = clientTools;
      sessionOptions.clientTools = clientTools;

      const userOnConversationCreated = sessionOptions.onConversationCreated;
      const isStaleStartSession = () =>
        startSessionId !== startSessionIdRef.current;

      const handleConversationCreated = (conv: Conversation) => {
        if (shouldEndRef.current || isStaleStartSession()) {
          return;
        }
        conversationRef.current = conv;
        setConversation(conv);
        userOnConversationCreated?.(conv);
      };

      const handleConnect: NonNullable<Callbacks["onConnect"]> = props => {
        if (shouldEndRef.current || isStaleStartSession()) {
          return;
        }
        lockRef.current = null;
        sessionOptions.onConnect?.(props);
      };

      const providerLifecycleOptions: ConversationLifecycleOptions &
        Pick<Callbacks, "onConnect"> = {
        onConversationCreated: handleConversationCreated,
        onConnect: handleConnect,
      };

      const startSessionOptions: Options = {
        ...sessionOptions,
        ...providerLifecycleOptions,
      };

      lockRef.current = Conversation.startSession(startSessionOptions);

      lockRef.current.then(
        conv => {
          if (isStaleStartSession()) {
            return;
          }
          setIsStarting(false);
          if (shouldEndRef.current) {
            conv.endSession();
            lockRef.current = null;
            return;
          }
          if (conversationRef.current !== conv) {
            conversationRef.current = conv;
            setConversation(conv);
          }
          lockRef.current = null;
        },
        (error: unknown) => {
          if (isStaleStartSession()) {
            return;
          }
          setIsStarting(false);
          conversationRef.current = null;
          setConversation(null);
          lockRef.current = null;
          if (shouldEndRef.current) {
            return;
          }
          const message =
            error instanceof Error
              ? error.message
              : "Session failed to start";
          setStartupError(message);
          sessionOptions.onError?.(message, error);
        }
      );
    },
    [stableCallbacks, clientToolsRegistry, clientToolsRef]
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
      isStarting,
      startupError,
      clientToolsRegistry,
      clientToolsRef,
    }),
    [conversation, conversationRef, startSession, endSession, isStarting, startupError, clientToolsRegistry, clientToolsRef]
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
