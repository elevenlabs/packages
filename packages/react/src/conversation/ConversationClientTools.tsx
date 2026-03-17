import { createContext, useCallback, useContext, useLayoutEffect, useRef } from "react";
import type { ClientToolsConfig } from "@elevenlabs/client";
import { ConversationContext } from "./ConversationContext";
import type { ClientToolHandler } from "./types";

type ClientToolEntry = ClientToolsConfig["clientTools"][string];

/**
 * Creates a Proxy that delegates all property access to `target`.
 * The Proxy ensures `BaseConversation.handleClientToolCall` sees
 * dynamically registered tools via its `hasOwnProperty` + bracket-access
 * pattern, since the underlying target is mutated in place.
 */
export function createClientToolsProxy(
  target: Record<string, ClientToolEntry>
): Record<string, ClientToolEntry> {
  return new Proxy(target, {
    get: (t, prop, receiver) => Reflect.get(t, prop, receiver),
    has: (t, prop) => Reflect.has(t, prop),
    set: (t, prop, value, receiver) => Reflect.set(t, prop, value, receiver),
    deleteProperty: (t, prop) => Reflect.deleteProperty(t, prop),
    getOwnPropertyDescriptor: (t, prop) =>
      Reflect.getOwnPropertyDescriptor(t, prop),
    ownKeys: t => Reflect.ownKeys(t),
  });
}

// ---------------------------------------------------------------------------
// Sub-provider
// ---------------------------------------------------------------------------

type RegisterClientTool = (
  name: string,
  handler: ClientToolEntry
) => () => void;

const ConversationClientToolsContext = createContext<RegisterClientTool | null>(
  null
);

export function ConversationClientToolsProvider({
  children,
}: React.PropsWithChildren) {
  const ctx = useContext(ConversationContext);
  if (!ctx) {
    throw new Error(
      "ConversationClientToolsProvider must be rendered inside a ConversationProvider"
    );
  }

  // Capture the mutable target in a ref so the linter does not flag
  // property writes on a value returned from useContext.
  const clientToolsTargetRef = useRef(ctx.clientToolsTarget);

  const registerClientTool: RegisterClientTool = useCallback(
    (name, handler) => {
      const target = clientToolsTargetRef.current;
      target[name] = handler;
      return () => {
        // Only delete if the handler still matches — prevents a stale
        // unmount from removing a newer registration for the same name.
        if (target[name] === handler) {
          delete target[name];
        }
      };
    },
    []
  );

  return (
    <ConversationClientToolsContext.Provider value={registerClientTool}>
      {children}
    </ConversationClientToolsContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Registers a named client tool with the nearest `ConversationProvider`.
 * The tool is available during any active conversation and is automatically
 * unregistered when the component unmounts.
 *
 * The handler always reflects the latest closure value (ref pattern),
 * so it is safe to reference component state or props without listing
 * them as dependencies.
 *
 * @param name    - The tool name (must match the name configured on the agent).
 * @param handler - The function invoked when the agent calls this tool.
 *
 * @example
 * ```tsx
 * useConversationClientTool<{ city: string }>("get_weather", (params) => {
 *   return `Weather in ${params.city} is sunny.`;
 * });
 * ```
 */
export function useConversationClientTool<TParams = unknown>(
  name: string,
  handler: ClientToolHandler<TParams>
): void {
  const registerClientTool = useContext(ConversationClientToolsContext);
  if (!registerClientTool) {
    throw new Error(
      "useConversationClientTool must be used within a ConversationProvider"
    );
  }

  const handlerRef = useRef(handler);
  // eslint-disable-next-line react-hooks/refs -- intentional sync during render for latest-ref pattern
  handlerRef.current = handler;

  useLayoutEffect(() => {
    const stableHandler: ClientToolEntry = parameters =>
      handlerRef.current(parameters as TParams);
    return registerClientTool(name, stableHandler);
  }, [registerClientTool, name]);
}
