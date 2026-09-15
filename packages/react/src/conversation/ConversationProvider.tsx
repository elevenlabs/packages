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
  isSessionAbortError,
  waitForSessionCleanup,
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

type PendingSession = {
  promise: Promise<Conversation>;
  controller: AbortController;
  teardown: () => Promise<void>;
  failed: boolean;
  retry: { options?: HookOptions } | null;
};

export function ConversationProvider({
  children,
  isMuted,
  onMutedChange,
  ...defaultOptions
}: ConversationProviderProps) {
  /** The active conversation instance, if any. */
  const conversationRef = useRef<Conversation | null>(null);
  /** In-flight startSession promise, used to prevent duplicate connections. */
  const lockRef = useRef<PendingSession | null>(null);
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
    function startSession(options?: HookOptions) {
      const defaults = defaultOptionsRef.current;
      const externalSignal = options?.signal ?? defaults?.signal;
      if (externalSignal?.aborted) {
        return;
      }
      if (conversationRef.current) {
        return;
      }
      if (lockRef.current) {
        if (
          lockRef.current.failed &&
          !shouldEndRef.current &&
          !lockRef.current.controller.signal.aborted
        ) {
          lockRef.current.retry = { options };
        }
        return;
      }

      shouldEndRef.current = false;
      const startSessionId = ++startSessionIdRef.current;

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
      const sessionConfig: HookOptions = { ...options };
      delete defaultConfig.signal;
      delete sessionConfig.signal;
      for (const key of CALLBACK_KEYS) {
        delete (defaultConfig as Record<string, unknown>)[key];
      }

      const sessionOptions = mergeOptions<Options>(
        { livekitUrl: calculatedLivekitUrl },
        defaultConfig,
        stableCallbacks,
        listenerMap.compose(),
        sessionConfig,
        { origin }
      );

      const clientTools = buildClientTools(
        sessionOptions.clientTools,
        clientToolsRegistry
      );
      clientToolsRef.current = clientTools;
      sessionOptions.clientTools = clientTools;

      const controller = new AbortController();
      const isStaleStartSession = () =>
        startSessionId !== startSessionIdRef.current;
      const forwardExternalAbort = () => {
        if (
          isStaleStartSession() ||
          controller.signal.aborted ||
          (conversationRef.current && !lockRef.current)
        ) {
          return;
        }
        shouldEndRef.current = true;
        controller.abort(externalSignal?.reason);
        if (conversationRef.current) {
          conversationRef.current = null;
          setConversation(null);
        }
      };
      if (externalSignal?.aborted) {
        forwardExternalAbort();
      } else {
        externalSignal?.addEventListener("abort", forwardExternalAbort, {
          once: true,
        });
      }
      sessionOptions.signal = controller.signal;

      // A superseded or cancelled start can keep emitting events during
      // teardown. Only terminal lifecycle callbacks and feedback reset may
      // update this session after cancellation; a newer session drops all.
      const reportActiveError = sessionOptions.onError;
      for (const key of CALLBACK_KEYS) {
        const callback = sessionOptions[key];
        if (typeof callback === "function") {
          (sessionOptions as Record<string, unknown>)[key] = (
            ...args: never[]
          ) => {
            const isFeedbackReset =
              key === "onCanSendFeedbackChange" &&
              (args[0] as { canSendFeedback?: boolean } | undefined)
                ?.canSendFeedback === false;
            if (
              !isStaleStartSession() &&
              (!controller.signal.aborted ||
                key === "onStatusChange" ||
                key === "onDisconnect" ||
                isFeedbackReset)
            ) {
              (callback as (...a: never[]) => void)(...args);
            }
          };
        }
      }

      const userOnConversationCreated = sessionOptions.onConversationCreated;
      const userOnDisconnect = sessionOptions.onDisconnect;

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

      // "disconnecting" marks the moment the session stops being usable, on
      // every path (agent hangup, raw endSession(), provider endSession()) —
      // release the conversation here so it clears in the same React batch
      // as the status transition, and consumers never observe a live status
      // with a released conversation (or vice versa). Stale sessions are
      // dropped entirely so a late "disconnected" can't clobber the status
      // of a session that replaced this one.
      const handleStatusChange: NonNullable<
        Callbacks["onStatusChange"]
      > = props => {
        if (isStaleStartSession()) {
          return;
        }
        if (
          controller.signal.aborted &&
          (props.status === "connecting" || props.status === "connected")
        ) {
          return;
        }
        if (
          props.status === "disconnecting" &&
          thisSessionConv !== null &&
          conversationRef.current === thisSessionConv
        ) {
          conversationRef.current = null;
          setConversation(null);
        }
        sessionOptions.onStatusChange?.(props);
      };

      // Syncs provider state when this session ends, whether externally
      // (agent disconnect) or via endSession(). Only clears conversationRef
      // if it still points at this session's conversation.
      const handleDisconnect: NonNullable<
        Callbacks["onDisconnect"]
      > = details => {
        if (isStaleStartSession()) {
          return;
        }
        if (conversationRef.current === thisSessionConv) {
          conversationRef.current = null;
          setConversation(null);
        }
        userOnDisconnect?.(details);
      };

      const providerLifecycleOptions: ConversationLifecycleOptions &
        Pick<Callbacks, "onConnect" | "onDisconnect" | "onStatusChange"> = {
        onConversationCreated: handleConversationCreated,
        onConnect: handleConnect,
        onDisconnect: handleDisconnect,
        onStatusChange: handleStatusChange,
      };

      const startSessionOptions: Options = {
        ...sessionOptions,
        ...providerLifecycleOptions,
      };

      const startPromise = Conversation.startSession(startSessionOptions);
      let teardownPromise: Promise<void> | null = null;
      const pendingSession: PendingSession = {
        promise: startPromise,
        controller,
        failed: false,
        retry: null,
        teardown: () => {
          teardownPromise ??= startPromise
            .then(
              conv =>
                conv
                  .endSession()
                  .catch(error => console.warn("Error ending session:", error)),
              () => {}
            )
            .then(() => waitForSessionCleanup(controller.signal))
            .finally(() => {
              if (lockRef.current === pendingSession) {
                lockRef.current = null;
                const retry = pendingSession.retry;
                pendingSession.retry = null;
                const retrySignal =
                  retry?.options?.signal ?? defaultOptionsRef.current.signal;
                if (
                  retry &&
                  !shouldEndRef.current &&
                  !controller.signal.aborted &&
                  !retrySignal?.aborted
                ) {
                  try {
                    startSession(retry.options);
                  } catch (error) {
                    console.warn("Error restarting session:", error);
                  }
                }
              }
            });
          return teardownPromise;
        },
      };
      lockRef.current = pendingSession;

      void startPromise.then(
        () =>
          externalSignal?.removeEventListener("abort", forwardExternalAbort),
        () => externalSignal?.removeEventListener("abort", forwardExternalAbort)
      );

      startPromise.then(
        conv => {
          if (isStaleStartSession()) {
            return;
          }
          if (shouldEndRef.current || controller.signal.aborted) {
            void pendingSession.teardown();
            return;
          }
          if (conversationRef.current !== conv) {
            thisSessionConv = conv;
            conversationRef.current = conv;
            setConversation(conv);
          }
          if (lockRef.current === pendingSession) {
            lockRef.current = null;
          }
        },
        (error: unknown) => {
          if (isStaleStartSession()) {
            return;
          }
          conversationRef.current = null;
          setConversation(null);
          void pendingSession.teardown();
          // The start promise is the race arbiter. Suppress only an intentional
          // cancellation; if an active failure settled first, preserve it even
          // when endSession() was called before this reaction ran.
          if (controller.signal.aborted && isSessionAbortError(error)) {
            return;
          }
          pendingSession.failed = true;
          // The client SDK calls onStatusChange("disconnected") before
          // rejecting, but never calls onError — surface the failure here
          // so listeners (e.g. ConversationStatusProvider) transition to
          // the "error" state with a meaningful message.
          const message =
            error instanceof Error ? error.message : "Session failed to start";
          reportActiveError?.(message, error);
        }
      );
    },
    [stableCallbacks, listenerMap, clientToolsRegistry, clientToolsRef]
  );

  const endSession = useCallback((): Promise<void> => {
    shouldEndRef.current = true;
    const pendingConnection = lockRef.current;
    const conv = conversationRef.current;
    conversationRef.current = null;
    setConversation(null);

    if (pendingConnection) {
      pendingConnection.controller.abort();
      return pendingConnection.teardown();
    }
    return (
      conv
        ?.endSession()
        .catch(error => console.warn("Error ending session:", error)) ??
      Promise.resolve()
    );
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      shouldEndRef.current = true;
      if (lockRef.current) {
        lockRef.current.controller.abort();
        void lockRef.current.teardown();
      } else {
        void conversationRef.current?.endSession().catch(() => {});
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
