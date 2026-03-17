import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Conversation,
  type Options,
  type Callbacks,
  type ClientToolsConfig,
} from "@elevenlabs/client";
import {
  CALLBACK_KEYS,
  mergeOptions,
  parseLocation,
  getOriginForLocation,
  getLivekitUrlForLocation,
} from "@elevenlabs/client/internal";

import { type HookOptions } from "./types";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext";
import { ConversationControlsProvider } from "./ConversationControls";
import { ConversationStatusProvider } from "./ConversationStatus";
import { ConversationInputProvider } from "./ConversationInput";
import { ConversationModeProvider } from "./ConversationMode";
import { ConversationFeedbackProvider } from "./ConversationFeedback";
import {
  ConversationClientToolsProvider,
  createClientToolsProxy,
} from "./ConversationClientTools";
import { ListenerMap } from "./ListenerMap";
import { useStableCallbacks } from "./useStableCallbacks";

const SUB_PROVIDERS: React.ComponentType<React.PropsWithChildren>[] = [
  ConversationControlsProvider,
  ConversationStatusProvider,
  ConversationInputProvider,
  ConversationModeProvider,
  ConversationFeedbackProvider,
  ConversationClientToolsProvider,
];

export type ConversationProviderProps = React.PropsWithChildren<HookOptions>;

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
  /** Mutable target backing the dynamic clientTools Proxy. */
  const [clientToolsTarget] = useState<
    Record<string, ClientToolsConfig["clientTools"][string]>
  >(() => ({}));
  /** Proxy that delegates to clientToolsTarget — passed as clientTools to the session. */
  const [clientToolsProxy] = useState(() =>
    createClientToolsProxy(clientToolsTarget)
  );
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

      // Merge statically-provided clientTools into the dynamic target,
      // then use the Proxy so tools added via useConversationClientTool
      // are visible to BaseConversation at call time.
      Object.assign(clientToolsTarget, sessionOptions.clientTools);
      sessionOptions.clientTools = clientToolsProxy;

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
        () => {
          lockRef.current = null;
        }
      );
    },
    [stableCallbacks, listenerMap, clientToolsTarget, clientToolsProxy]
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
    () => ({
      conversation,
      conversationRef,
      startSession,
      endSession,
      registerCallbacks,
      clientToolsTarget,
    }),
    [conversation, conversationRef, startSession, endSession, registerCallbacks, clientToolsTarget]
  );

  const wrappedChildren = SUB_PROVIDERS.reduceRight<React.ReactNode>(
    (nested, Provider) => <Provider>{nested}</Provider>,
    children
  );

  return (
    <ConversationContext.Provider value={contextValue}>
      {wrappedChildren}
    </ConversationContext.Provider>
  );
}
