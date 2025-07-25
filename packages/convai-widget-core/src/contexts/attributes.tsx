import { ReadonlySignal, Signal, signal, useComputed } from "@preact/signals";
import { createContext, useMemo } from "preact/compat";
import {
  CustomAttributeList,
  CustomAttributes,
  parseBoolAttribute,
} from "../types/attributes";
import type { JSX } from "preact";
import { useContextSafely } from "../utils/useContextSafely";

export type AttributeSignals = {
  [key in (typeof CustomAttributeList)[number]]: Signal<string | undefined>;
};

export type AttributeReadonlySignals = {
  [key in (typeof CustomAttributeList)[number]]: ReadonlySignal<
    string | undefined
  >;
};

const AttributesContext = createContext<AttributeReadonlySignals | null>(null);

interface AttributesProviderProps {
  value: CustomAttributes;
  children: JSX.Element;
}

export function AttributesProvider({
  value,
  children,
}: AttributesProviderProps) {
  const signals = useMemo(
    () =>
      Object.fromEntries(
        CustomAttributeList.map(key => [key, signal(value[key])])
      ) as AttributeSignals,
    []
  );

  // Update signals with overrides passed via custom HTML attributes
  CustomAttributeList.forEach(key => {
    signals[key].value = value[key];
  });

  return (
    <AttributesContext.Provider value={signals}>
      {children}
    </AttributesContext.Provider>
  );
}

export function useAttributes() {
  return useContextSafely(AttributesContext);
}

export function useAttribute(name: (typeof CustomAttributeList)[number]) {
  return useAttributes()[name];
}
