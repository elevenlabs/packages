// APIs which we expect to be available in the runtime environment, but which are not part of the standard library.

// Console logging

declare interface Console {
  log(message?: unknown, ...optionalParams: unknown[]): void;
  error(message?: unknown, ...optionalParams: unknown[]): void;
  warn(message?: unknown, ...optionalParams: unknown[]): void;
  info(message?: unknown, ...optionalParams: unknown[]): void;
  debug(message?: unknown, ...optionalParams: unknown[]): void;
}

declare const console: Console;

// Timers and microtasks APIs

declare function setTimeout(
  callback: () => void,
  ms?: number,
  ...args: unknown[]
): number;

declare function setInterval(
  callback: () => void,
  ms?: number,
  ...args: unknown[]
): number;

declare function setImmediate(callback: () => void, ...args: unknown[]): number;

declare function clearTimeout(handle?: number): void;

declare function clearInterval(handle?: number): void;

declare function clearImmediate(handle?: number): void;

declare function queueMicrotask(callback: () => void): void;
