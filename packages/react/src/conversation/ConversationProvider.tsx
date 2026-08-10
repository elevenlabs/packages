import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ListenerMap } from "./ListenerMap.js";
import { useStableCallbacks } from "./useStableCallbacks.js";

type ConversationInputControlProps = Pick<
  ConversationInputProviderProps,
  "isMuted" | "onMutedChange"
>;

const SUB_PROVIDERS_WITHOUT_PROPS: React.ComponentType<React.PropsWithChildren>[] =
  [
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
  const clientToolsRef = useRef<
    Record<string, NonNullable<Options["clientTools"]>[string]>
  >({});
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

  const startSession = useCallback(
    (options?: HookOptions) => {
      if (conversationRef.current) {
        return;
      }
      if (lockRef.current) {
        return;
      }

      shouldEndRef.current = false;
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

      const userOnConversationCreated = sessionOptions.onConversationCreated;
      const userOnDisconnect = sessionOptions.onDisconnect;
      const isStaleStartSession = () =>
        startSessionId !== startSessionIdRef.current;

      // Set once this session's conversation is known. endSession() clears
      // conversationRef optimistically (so restart-from-callback patterns
      // keep working), which means a session's own onDisconnect can still
      // arrive after a *newer* session has taken the ref — this check stops
      // that late arrival from clearing state that isn't its own.
      let thisSessionConv: Conversation | null = null;

      const handleConversationCreated = (conv: Conversation) => {
        thisSessionConv = conv;
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

      // Syncs provider state when this session ends, whether externally
      // (agent disconnect) or via endSession(). Only clears conversationRef
      // if it still points at this session's conversation.
      const handleDisconnect: NonNullable<
        Callbacks["onDisconnect"]
      > = details => {
        if (conversationRef.current === thisSessionConv) {
          conversationRef.current = null;
          setConversation(null);
        }
        userOnDisconnect?.(details);
      };

      const providerLifecycleOptions: ConversationLifecycleOptions &
        Pick<Callbacks, "onConnect" | "onDisconnect"> = {
        onConversationCreated: handleConversationCreated,
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
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
          if (shouldEndRef.current) {
            conv
              .endSession()
              .catch(error => console.warn("Error ending session:", error));
            lockRef.current = null;
            return;
          }
          if (conversationRef.current !== conv) {
            thisSessionConv = conv;
            conversationRef.current = conv;
            setConversation(conv);
          }
          lockRef.current = null;
        },
        (error: unknown) => {
          if (isStaleStartSession()) {
            return;
          }
          conversationRef.current = null;
          setConversation(null);
          lockRef.current = null;
          if (shouldEndRef.current) {
            return;
          }
          // The client SDK calls onStatusChange("disconnected") before
          // rejecting, but never calls onError — surface the failure here
          // so listeners (e.g. ConversationStatusProvider) transition to
          // the "error" state with a meaningful message.
          const message =
            error instanceof Error ? error.message : "Session failed to start";
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
      pendingConnection.then(
        c =>
          c
            .endSession()
            .catch(error => console.warn("Error ending session:", error)),
        () => {}
      );
    } else {
      conv
        ?.endSession()
        .catch(error => console.warn("Error ending session:", error));
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldEndRef.current = true;
      if (lockRef.current) {
        lockRef.current.then(
          conv => conv.endSession().catch(() => {}),
          () => {}
        );
      } else {
        conversationRef.current?.endSession().catch(() => {});
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
    [
      conversation,
      conversationRef,
      startSession,
      endSession,
      registerCallbacks,
      clientToolsRegistry,
      clientToolsRef,
    ]
  );

  const wrappedChildren =
    SUB_PROVIDERS_WITHOUT_PROPS.reduceRight<React.ReactNode>(
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
