import { createContext, useCallback, useContext, useLayoutEffect, useRef } from "react";
import type { ClientToolsConfig } from "@elevenlabs/client";
import { ConversationContext } from "./ConversationContext.js";
import type { ClientTool, ClientTools } from "./types.js";

type ClientToolEntry = ClientToolsConfig["clientTools"][string];

/**
 * Creates a fresh clientTools object by merging option-provided tools with
 * hook-registered tools from the registry. Throws if a hook-registered tool
 * name conflicts with an option-provided tool.
 */
export function buildClientTools(
  optionTools: Record<string, ClientToolEntry> | undefined,
  registry: Map<string, ClientToolEntry>
): Record<string, ClientToolEntry> {
  const clientTools: Record<string, ClientToolEntry> = { ...optionTools };
  for (const [name, handler] of registry) {
    if (Object.hasOwn(clientTools, name)) {
      throw new Error(
        `Client tool "${name}" is already provided via props/options. ` +
          `Remove it from props or do not register it with useConversationClientTool.`
      );
    }
    clientTools[name] = handler;
  }
  return clientTools;
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

  const { clientToolsRegistry, clientToolsRef } = ctx;

  const registerClientTool: RegisterClientTool = useCallback(
    (name, handler) => {
      if (clientToolsRegistry.has(name)) {
        throw new Error(
          `Client tool "${name}" is already registered by another hook. ` +
            `Each tool name must be unique.`
        );
      }
      clientToolsRegistry.set(name, handler);
      clientToolsRef.current[name] = handler;
      return () => {
        if (clientToolsRegistry.get(name) === handler) {
          clientToolsRegistry.delete(name);
        }
        if (clientToolsRef.current[name] === handler) {
          delete clientToolsRef.current[name];
        }
      };
    },
    [clientToolsRegistry, clientToolsRef]
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
 * @typeParam TTools - An interface mapping tool names to function signatures.
 * @typeParam TName  - The specific tool name (inferred from the first argument).
 * @param name    - The tool name (must match the name configured on the agent).
 * @param handler - The function invoked when the agent calls this tool.
 *
 * @example
 * ```tsx
 * type Tools = {
 *   get_weather: (params: { city: string }) => string;
 *   set_volume: (params: { level: number }) => void;
 * };
 *
 * useConversationClientTool<Tools>("get_weather", (params) => {
 *   return `Weather in ${params.city} is sunny.`;
 * });
 * ```
 */
export function useConversationClientTool<
  TTools extends ClientTools = Record<string, ClientTool>,
  TName extends string & keyof TTools = string & keyof TTools,
>(name: TName, handler: TTools[TName]): void {
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
      handlerRef.current(parameters as Parameters<TTools[TName]>[0]);
    return registerClientTool(name, stableHandler);
  }, [registerClientTool, name]);
}
