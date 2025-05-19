import { ReadonlySignal, signal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";

import { useContextSafely } from "../utils/useContextSafely";
import { useWidgetConfig } from "./widget-config";

const TermsContext = createContext<{
  termsAccepted: ReadonlySignal<boolean>;
  termsShown: ReadonlySignal<boolean>;
  requestTerms: () => Promise<void>;
  dismissTerms: () => void;
  acceptTerms: () => void;
} | null>(null);

interface TermsProviderProps {
  children: ComponentChildren;
}

interface StoredPromise {
  resolve: () => void;
  reject: () => void;
}

export function TermsProvider({ children }: TermsProviderProps) {
  const config = useWidgetConfig();

  const value = useMemo(() => {
    const key = config.peek().terms_key;
    const termsAlreadyAccepted = key ? !!localStorage.getItem(key) : false;
    const termsAccepted = signal(termsAlreadyAccepted);
    const termsShown = signal(false);
    let termsPromises: StoredPromise[] = [];

    return {
      termsShown,
      termsAccepted,
      dismissTerms: () => {
        termsShown.value = false;
        termsPromises.forEach(value => value.reject());
        termsPromises = [];
      },
      acceptTerms: () => {
        termsAccepted.value = true;
        termsShown.value = false;
        const key = config.peek().terms_key;
        if (key) {
          localStorage.setItem(key, "true");
        }

        termsPromises.forEach(value => value.resolve());
        termsPromises = [];
      },
      requestTerms: async () => {
        if (!termsAccepted.peek()) {
          termsShown.value = true;
          await new Promise<void>((resolve, reject) => {
            termsPromises.push({ resolve, reject });
          });
        }
      },
    };
  }, []);

  return (
    <TermsContext.Provider value={value}>{children}</TermsContext.Provider>
  );
}

export function useTerms() {
  return useContextSafely(TermsContext);
}
