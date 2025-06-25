import { computed, ReadonlySignal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { useAttribute } from "./attributes";

import { useContextSafely } from "../utils/useContextSafely";
import { Location, parseLocation } from "../types/config"


const ServerLocationContext = createContext<{
  location: ReadonlySignal<Location>;
  serverUrl: ReadonlySignal<string>;
  webSocketUrl: ReadonlySignal<string>;
} | null>(null);

interface ServerLocationProviderProps {
  children: ComponentChildren;
}

export function ServerLocationProvider({
  children,
}: ServerLocationProviderProps) {
  const serverLocation = useAttribute("server-location");
  const value = useMemo(() => {
    const location = computed(() => parseLocation(serverLocation.value));

    const serverUrlMap: Record<Location, string> = {
      'us': import.meta.env.VITE_SERVER_URL_US,
      'eu-residency': import.meta.env.VITE_SERVER_URL_EU_RESIDENCY,
      'in-residency': import.meta.env.VITE_SERVER_URL_IN_RESIDENCY,
      'global': import.meta.env.VITE_SERVER_URL,
    };
    
    const websocketUrlMap: Record<Location, string> = {
      'us': import.meta.env.VITE_WEBSOCKET_URL_US,
      'eu-residency': import.meta.env.VITE_WEBSOCKET_URL_EU_RESIDENCY,
      'in-residency': import.meta.env.VITE_WEBSOCKET_URL_IN_RESIDENCY,
      'global': import.meta.env.VITE_WEBSOCKET_URL,
    };
    
    return {
      location,
      serverUrl: computed(() => serverUrlMap[location.value]),
      webSocketUrl: computed(() => websocketUrlMap[location.value]),
    };
  }, []);

  return (
    <ServerLocationContext.Provider value={value}>
      {children}
    </ServerLocationContext.Provider>
  );
}

export function useServerLocation() {
  return useContextSafely(ServerLocationContext);
}
