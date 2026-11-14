import {
  computed,
  ReadonlySignal,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";

import { useContextSafely } from "../utils/useContextSafely";
import { useLocalizedTerms } from "./widget-config";

const TermsContext = createContext<{
  termsAccepted: ReadonlySignal<boolean>;
  termsShown: ReadonlySignal<boolean>;
  requestTerms: () => Promise<boolean>;
  dismissTerms: () => void;
  acceptTerms: () => void;
} | null>(null);

interface TermsProviderProps {
  children: ComponentChildren;
}

export function TermsProvider({ children }: TermsProviderProps) {
  const localizedTerms = useLocalizedTerms();

  const termsShown = useSignal(false);
  const termsAcceptedState = useSignal(false);

  const value = useMemo(() => {
    const termsAccepted = computed(
      () => !localizedTerms.value.terms_html || termsAcceptedState.value
    );
    let resolveRequests: ((accepted: boolean) => void)[] = [];

    return {
      termsShown,
      termsAccepted,
      dismissTerms: () => {
        termsShown.value = false;
        resolveRequests.forEach(resolve => resolve(false));
        resolveRequests = [];
      },
      acceptTerms: () => {
        termsAcceptedState.value = true;
        termsShown.value = false;
        const key = localizedTerms.peek().terms_key;
        if (key) {
          localStorage.setItem(key, "true");
        }

        resolveRequests.forEach(resolve => resolve(true));
        resolveRequests = [];
      },
      requestTerms: async () => {
        if (termsAccepted.peek()) return true;
        termsShown.value = true;
        return new Promise<boolean>(resolve => {
          resolveRequests.push(resolve);
        });
      },
    };
  }, [termsShown, termsAcceptedState, localizedTerms]);

  useSignalEffect(() => {
    const key = localizedTerms.value.terms_key;
    const termsAlreadyAccepted = key ? !!localStorage.getItem(key) : false;
    termsAcceptedState.value = termsAlreadyAccepted;
  });

  return (
    <TermsContext.Provider value={value}>{children}</TermsContext.Provider>
  );
}

export function useTerms() {
  return useContextSafely(TermsContext);
}
