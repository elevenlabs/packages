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
  CALLBACK_KEYS,
  mergeOptions,
  parseLocation,
  getOriginForLocation,
  getLivekitUrlForLocation,
  type Options,
  type Callbacks,
} from "@elevenlabs/client";

import { type HookOptions } from "../index";
import { PACKAGE_VERSION } from "../version";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext";
import { ConversationControlsProvider } from "./ConversationControls";
import { ConversationStatusProvider } from "./ConversationStatus";
import { ConversationInputProvider } from "./ConversationInput";
import { ConversationModeProvider } from "./ConversationMode";
import { ConversationFeedbackProvider } from "./ConversationFeedback";
import { ListenerMap } from "./ListenerMap";

const SUB_PROVIDERS: React.ComponentType<React.PropsWithChildren>[] = [
  ConversationControlsProvider,
  ConversationStatusProvider,
  ConversationInputProvider,
  ConversationModeProvider,
  ConversationFeedbackProvider,
];

export type ConversationProviderProps = React.PropsWithChildren<HookOptions>;

/**
 * Wraps user-provided callback props in stable ref-backed functions,
 * preventing stale closure bugs when the session outlives renders.
 *
 * Returns a `Partial<Callbacks>` containing only the keys the caller
 * actually provided. Function references are stable per key across
 * renders, but always invoke the latest prop value. The returned object
 * reference is stable as long as the set of provided keys doesn't change.
 */
function useStableCallbacks(props: HookOptions): Partial<Callbacks> {
  // Store the latest prop value for each callback in a ref.
  // Uses Record<string, unknown> to avoid TypeScript's union-to-intersection
  // issue when indexing Callbacks with a union of all its keys.
  const callbackRefs = useRef<Record<string, unknown>>({});
  for (const key of CALLBACK_KEYS) {
    callbackRefs.current[key] = props[key];
  }

  // Compute a stable scalar from the set of provided keys so we can
  // memoize the result object.
  const activeKeys = CALLBACK_KEYS.filter(key => props[key] !== undefined);

  return useMemo(
    () =>
      Object.fromEntries(
        activeKeys.map(key => [
          key,
          (...args: unknown[]) => {
            const fn = callbackRefs.current[key] as
              | ((...a: unknown[]) => void)
              | undefined;
            fn?.(...args);
          },
        ])
      ) as Partial<Callbacks>,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- activeKeysKey is a stable scalar derived from activeKeys
    [activeKeys.join("|")]
  );
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

      lockRef.current = Conversation.startSession(
        mergeOptions<Options>(
          { livekitUrl: calculatedLivekitUrl },
          defaultConfig,
          stableCallbacks,
          listenerMap.compose(),
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
    [stableCallbacks, listenerMap]
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
    }),
    [conversation, conversationRef, startSession, endSession, registerCallbacks]
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
