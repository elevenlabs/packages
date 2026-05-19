// Cross-platform runtime globals.
//
// These APIs are available natively on the web, Node.js (>=18), and
// React Native, but are not part of TypeScript's standard library when
// `lib` omits "DOM". We declare the minimal subset actually used by
// the codebase so that `tsconfig.common.json` (lib: ["ES2022"]) compiles
// without DOM.
//
// Because this file has an `export`, TypeScript treats it as a module.
// All ambient declarations must therefore be inside `declare global`.

declare global {
  // -------------------------------------------------------------------------
  // Console logging
  // -------------------------------------------------------------------------

  interface Console {
    log(message?: unknown, ...optionalParams: unknown[]): void;
    error(message?: unknown, ...optionalParams: unknown[]): void;
    warn(message?: unknown, ...optionalParams: unknown[]): void;
    info(message?: unknown, ...optionalParams: unknown[]): void;
    debug(message?: unknown, ...optionalParams: unknown[]): void;
  }

  var console: Console;

  // -------------------------------------------------------------------------
  // Timers and microtasks
  // -------------------------------------------------------------------------

  function setTimeout(
    callback: () => void,
    ms?: number,
    ...args: unknown[]
  ): number;

  function setInterval(
    callback: () => void,
    ms?: number,
    ...args: unknown[]
  ): number;

  function setImmediate(callback: () => void, ...args: unknown[]): number;

  function clearTimeout(handle?: number): void;

  function clearInterval(handle?: number): void;

  function clearImmediate(handle?: number): void;

  function queueMicrotask(callback: () => void): void;

  // -------------------------------------------------------------------------
  // Fetch API
  // -------------------------------------------------------------------------

  function fetch(
    input: string | Request,
    init?: RequestInit
  ): Promise<Response>;

  class Headers {
    constructor(init?: Record<string, string> | [string, string][]);
    append(name: string, value: string): void;
    get(name: string): string | null;
    has(name: string): boolean;
    set(name: string, value: string): void;
  }

  class Request {
    constructor(input: string | Request, init?: RequestInit);
    readonly url: string;
    readonly method: string;
    readonly headers: Headers;
  }

  interface RequestInit {
    method?: string;
    headers?: Record<string, string> | Headers;
    body?: string | FormData | Blob | ArrayBuffer;
    signal?: AbortSignal;
  }

  class Response {
    readonly ok: boolean;
    readonly status: number;
    readonly statusText: string;
    readonly headers: Headers;
    json(): Promise<unknown>;
    text(): Promise<string>;
    blob(): Promise<Blob>;
    arrayBuffer(): Promise<ArrayBuffer>;
  }

  class FormData {
    append(name: string, value: string | Blob, filename?: string): void;
  }

  class Blob {
    readonly size: number;
    readonly type: string;
    constructor(
      parts?: (string | ArrayBuffer | Blob)[],
      options?: { type?: string }
    );
    text(): Promise<string>;
    arrayBuffer(): Promise<ArrayBuffer>;
  }

  // -------------------------------------------------------------------------
  // URL
  // -------------------------------------------------------------------------

  class URL {
    constructor(url: string, base?: string);
    readonly href: string;
    readonly origin: string;
    readonly protocol: string;
    readonly host: string;
    readonly hostname: string;
    readonly pathname: string;
    readonly search: string;
    readonly searchParams: URLSearchParams;
    toString(): string;
  }

  class URLSearchParams {
    constructor(init?: string | Record<string, string> | [string, string][]);
    append(name: string, value: string): void;
    get(name: string): string | null;
    has(name: string): boolean;
    set(name: string, value: string): void;
    toString(): string;
  }

  // -------------------------------------------------------------------------
  // Encoding
  // -------------------------------------------------------------------------

  class TextEncoder {
    encode(input?: string): Uint8Array;
  }

  class TextDecoder {
    constructor(label?: string, options?: { fatal?: boolean });
    decode(input?: ArrayBuffer | Uint8Array): string;
  }

  function btoa(data: string): string;
  function atob(data: string): string;

  // -------------------------------------------------------------------------
  // AbortController / AbortSignal (used transitively via fetch)
  // -------------------------------------------------------------------------

  class AbortController {
    readonly signal: AbortSignal;
    abort(reason?: unknown): void;
  }

  class AbortSignal {
    readonly aborted: boolean;
  }

  // -------------------------------------------------------------------------
  // WebSocket
  // -------------------------------------------------------------------------

  class WebSocket {
    static readonly CONNECTING: 0;
    static readonly OPEN: 1;
    static readonly CLOSING: 2;
    static readonly CLOSED: 3;

    constructor(url: string, protocols?: string | string[]);

    readonly readyState: number;

    send(data: string | ArrayBuffer | Uint8Array): void;
    close(code?: number, reason?: string): void;

    addEventListener(
      type: "open",
      listener: (event: Event) => void,
      options?: { once?: boolean }
    ): void;
    addEventListener(
      type: "close",
      listener: (event: CloseEvent) => void,
      options?: { once?: boolean }
    ): void;
    addEventListener(
      type: "message",
      listener: (event: MessageEvent) => void,
      options?: { once?: boolean }
    ): void;
    addEventListener(
      type: "error",
      listener: (event: Event) => void,
      options?: { once?: boolean }
    ): void;
  }

  // -------------------------------------------------------------------------
  // Media (polyfilled on React Native via @livekit/react-native)
  // -------------------------------------------------------------------------

  interface MediaStreamTrack {
    readonly kind: string;
    readonly id: string;
    enabled: boolean;
    stop(): void;
    clone(): MediaStreamTrack;
    getConstraints(): MediaTrackConstraints;
  }

  interface MediaTrackConstraints {
    deviceId?: string | { exact?: string; ideal?: string };
    echoCancellation?: boolean;
    noiseSuppression?: boolean;
    autoGainControl?: boolean;
    channelCount?: number | { exact?: number; ideal?: number };
    sampleRate?: number | { exact?: number; ideal?: number };
  }

  class MediaStream {
    constructor(tracks?: MediaStreamTrack[]);
    getTracks(): MediaStreamTrack[];
    getAudioTracks(): MediaStreamTrack[];
    addTrack(track: MediaStreamTrack): void;
  }

  // -------------------------------------------------------------------------
  // Events (minimal interfaces for WebSocket event handler type annotations)
  // -------------------------------------------------------------------------

  interface Event {
    readonly type: string;
  }

  interface CloseEvent extends Event {
    readonly code: number;
    readonly reason: string;
    readonly wasClean: boolean;
  }

  interface MessageEvent<T = string> extends Event {
    readonly data: T;
  }
}

// ---------------------------------------------------------------------------
// Runtime assertions
// ---------------------------------------------------------------------------

/**
 * Throws if any of the expected cross-platform globals are missing.
 * Call once at startup to surface environment issues early.
 */
export function assertRuntimeCompatibility(): void {
  const required = [
    "fetch",
    "WebSocket",
    "TextEncoder",
    "TextDecoder",
    "URL",
    "btoa",
    "atob",
  ];
  for (const name of required) {
    if (typeof (globalThis as Record<string, unknown>)[name] === "undefined") {
      throw new Error(`${name} is not available in this environment.`);
    }
  }
}
