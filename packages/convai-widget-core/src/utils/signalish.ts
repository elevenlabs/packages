import { useSignal } from "@preact/signals";
import { JSX } from "preact";

type SignalLike<T> = JSX.SignalLike<T>;
export type Signalish<T> = JSX.Signalish<T>;

function isSignal<T>(value: SignalLike<T> | T): value is SignalLike<T> {
  return value && typeof value === "object" && "peek" in value;
}

export function useSignalish<T>(value: SignalLike<T> | T): SignalLike<T> {
  const valueIsSignal = isSignal(value);
  const backingSignal = useSignal(valueIsSignal ? value.peek() : value);
  if (valueIsSignal) {
    return value;
  }

  backingSignal.value = value;
  return backingSignal;
}

export function getSignalish<T>(value: SignalLike<T> | T): T {
  return isSignal(value) ? value.value : value;
}

export function peekSignalish<T>(value: SignalLike<T> | T): T {
  return isSignal(value) ? value.peek() : value;
}
