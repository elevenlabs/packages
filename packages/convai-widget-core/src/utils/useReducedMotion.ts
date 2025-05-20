import { useEffect } from "preact/compat";
import { useSignal } from "@preact/signals";

const MediaQuery = window.matchMedia(`(prefers-reduced-motion: reduce)`);

export function useReducedMotion() {
  const reducedMotion = useSignal(MediaQuery.matches);
  useEffect(() => {
    const handler = (event: MediaQueryListEvent) => {
      reducedMotion.value = event.matches;
    };
    MediaQuery.addEventListener("change", handler);
    return () => MediaQuery.removeEventListener("change", handler);
  }, []);

  return reducedMotion;
}
