/**
 * Ambient declarations for APIs available across all target platforms
 * (browsers, Node.js 18+, React Native). This file is used by
 * tsconfig.common.json to type-check common files WITHOUT the DOM lib,
 * ensuring they don't accidentally depend on browser-only APIs.
 *
 * Only declare APIs here that are genuinely cross-platform.
 */

// -- Timers --
declare function setTimeout(
  callback: (...args: any[]) => void,
  ms?: number,
  ...args: any[]
): number;
declare function clearTimeout(id: number | undefined): void;
declare function setInterval(
  callback: (...args: any[]) => void,
  ms?: number,
  ...args: any[]
): number;
declare function clearInterval(id: number | undefined): void;
declare function queueMicrotask(callback: () => void): void;

// -- Console --
// eslint-disable-next-line no-var -- ambient globals require `declare var`
declare var console: {
  log(...data: any[]): void;
  warn(...data: any[]): void;
  error(...data: any[]): void;
  debug(...data: any[]): void;
  info(...data: any[]): void;
};

// -- Fetch --
declare function fetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response>;

declare class Headers {
  constructor(init?: Record<string, string> | [string, string][]);
  append(name: string, value: string): void;
  delete(name: string): void;
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  forEach(callback: (value: string, key: string) => void): void;
}

declare class Request {
  constructor(input: string | URL | Request, init?: RequestInit);
  readonly url: string;
  readonly method: string;
  readonly headers: Headers;
  readonly body: ReadableStream<Uint8Array> | null;
  json(): Promise<any>;
  text(): Promise<string>;
}

interface RequestInit {
  method?: string;
  headers?: Record<string, string> | Headers;
  body?: string | ArrayBuffer | Uint8Array | ReadableStream | null;
  signal?: AbortSignal;
}

declare class Response {
  constructor(
    body?: string | null,
    init?: {
      status?: number;
      statusText?: string;
      headers?: Record<string, string>;
    }
  );
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers: Headers;
  json(): Promise<any>;
  text(): Promise<string>;
}

// -- AbortController --
declare class AbortController {
  readonly signal: AbortSignal;
  abort(reason?: any): void;
}

declare class AbortSignal {
  readonly aborted: boolean;
  readonly reason: any;
  addEventListener(type: string, listener: (...args: any[]) => void): void;
  removeEventListener(type: string, listener: (...args: any[]) => void): void;
}

// -- WebSocket --
declare class WebSocket {
  constructor(url: string | URL, protocols?: string | string[]);
  readonly readyState: number;
  send(data: string | ArrayBuffer): void;
  close(code?: number, reason?: string): void;
  addEventListener(
    type: string,
    listener: (...args: any[]) => void,
    options?: { once?: boolean }
  ): void;
  removeEventListener(type: string, listener: (...args: any[]) => void): void;
  static readonly CONNECTING: 0;
  static readonly OPEN: 1;
  static readonly CLOSING: 2;
  static readonly CLOSED: 3;
}

// -- AnalyserNode (deprecated in core interfaces, minimal stub) --
// Only the subset used by InputController/OutputController/volumeProvider.
// The full AnalyserNode type is available in the DOM lib for web files.
interface AnalyserNode {
  readonly frequencyBinCount: number;
  fftSize: number;
  getByteFrequencyData(array: Uint8Array): void;
}

// -- URL --
declare class URL {
  constructor(url: string, base?: string | URL);
  readonly href: string;
  readonly origin: string;
  readonly protocol: string;
  readonly host: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  toString(): string;
}
