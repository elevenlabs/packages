import { PreactContext } from "preact";
import { useContext } from "preact/compat";

export function useContextSafely<T>(context: PreactContext<T>): NonNullable<T> {
  const value = useContext(context);
  if (value == null) {
    throw new Error(
      `${context.displayName} cannot be used outside of provider`
    );
  }
  return value as NonNullable<T>;
}
