import { createContext, useCallback } from "preact/compat";
import { useContextSafely } from "../utils/useContextSafely";
import { ComponentChildren } from "preact";
import { Signal, useSignal } from "@preact/signals";

const ShadowHostContext = createContext<Signal<HTMLElement | null> | null>(
  null
);

interface ShadowHostProviderProps {
  children: ComponentChildren;
}

export function ShadowHostProvider({ children }: ShadowHostProviderProps) {
  const host = useSignal<HTMLElement | null>(null);
  const setRef = useCallback(
    (node: HTMLElement | null) => {
      host.value = getShadowHost(node);
    },
    [host]
  );

  return (
    <ShadowHostContext.Provider value={host}>
      <template ref={setRef} />
      {children}
    </ShadowHostContext.Provider>
  );
}

export function useShadowHost() {
  return useContextSafely(ShadowHostContext);
}

function getShadowHost(node: HTMLElement | null) {
  if (!node) {
    return null;
  }

  const rootNode = node?.getRootNode();
  if (rootNode instanceof ShadowRoot && rootNode.host instanceof HTMLElement) {
    return rootNode.host;
  }

  // dev-mode fallback
  return node.parentElement;
}
