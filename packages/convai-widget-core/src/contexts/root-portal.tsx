import { createContext, HTMLAttributes, useState } from "preact/compat";

import { useContextSafely } from "../utils/useContextSafely";

const RootPortalContext = createContext<HTMLDivElement | null>(null);

interface RootPortalProviderProps extends HTMLAttributes<HTMLDivElement> {}

export function Root({ children, ...rest }: RootPortalProviderProps) {
  const [portal, setPortal] = useState<HTMLDivElement | null>(null);

  return (
    <div ref={setPortal} {...rest}>
      {portal && (
        <RootPortalContext.Provider value={portal}>
          {children}
        </RootPortalContext.Provider>
      )}
    </div>
  );
}

export function useRootPortal() {
  return useContextSafely(RootPortalContext);
}
