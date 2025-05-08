import { computed, ReadonlySignal } from "@preact/signals";
import { ComponentChildren } from "preact";
import { createContext, useMemo } from "preact/compat";
import { useAttribute } from "./attributes";

import { useContextSafely } from "../utils/useContextSafely";

export type Location = "us" | "global";

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

    return {
      location,
      serverUrl: computed(() =>
        location.value === "us"
          ? import.meta.env.VITE_SERVER_URL_US
          : import.meta.env.VITE_SERVER_URL
      ),
      webSocketUrl: computed(() =>
        location.value === "us"
          ? import.meta.env.VITE_WEBSOCKET_URL_US
          : import.meta.env.VITE_WEBSOCKET_URL
      ),
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

export function parseLocation(location: string = "us"): Location {
  switch (location) {
    case "us":
    case "global":
      return location;
    default:
      console.warn(
        `[ConversationalAI] Invalid server-location: ${location}. Defaulting to "us"`
      );
      return "us";
  }
}
