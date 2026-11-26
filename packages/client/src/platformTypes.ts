/**
 * Platform object types that appear in the public API.
 *
 * Published declarations must type-check whether or not the consumer loads
 * the DOM lib, so they never name DOM globals directly. Each type for a
 * platform class resolves to the consumer's own global class when one is
 * declared (the DOM lib, `@types/node`, React Native, ...), keeping the full
 * type for those consumers, and to the minimal shape declared here otherwise.
 * The SDK itself compiles against the minimal shapes, so it only relies on
 * members that every supported platform provides.
 */

type PlatformGlobal<Name extends string, Fallback> = typeof globalThis extends {
  [K in Name]: { prototype: infer T };
}
  ? T
  : Fallback;

export interface DeviceIdConstraintParameters {
  exact?: string | string[];
  ideal?: string | string[];
}

/**
 * Selects a media input device. Mirrors the DOM `ConstrainDOMString` type
 * accepted by `MediaTrackConstraints.deviceId`.
 */
export type DeviceIdConstraint =
  | string
  | string[]
  | DeviceIdConstraintParameters;

export type BlobLike = PlatformGlobal<
  "Blob",
  {
    readonly size: number;
    readonly type: string;
  }
>;

export type ResponseLike = PlatformGlobal<
  "Response",
  {
    readonly ok: boolean;
    readonly status: number;
    readonly statusText: string;
    json(): Promise<unknown>;
    text(): Promise<string>;
  }
>;

export type AbortSignalLike = PlatformGlobal<
  "AbortSignal",
  {
    readonly aborted: boolean;
    readonly reason: unknown;
    addEventListener(
      type: "abort",
      listener: () => void,
      options?: { once?: boolean }
    ): void;
    removeEventListener(type: "abort", listener: () => void): void;
  }
>;

export type CloseEventLike = PlatformGlobal<
  "CloseEvent",
  {
    readonly type: string;
    readonly code: number;
    readonly reason: string;
    readonly wasClean: boolean;
  }
>;

export type WebSocketLike = PlatformGlobal<
  "WebSocket",
  {
    readonly readyState: number;
    send(data: string | ArrayBuffer | Uint8Array): void;
    close(code?: number, reason?: string): void;
  }
>;

export type MediaStreamTrackLike = PlatformGlobal<
  "MediaStreamTrack",
  {
    readonly kind: string;
    readonly id: string;
    enabled: boolean;
    stop(): void;
  }
>;

export type AnalyserNodeLike = PlatformGlobal<
  "AnalyserNode",
  {
    readonly frequencyBinCount: number;
    getByteFrequencyData(array: Uint8Array<ArrayBuffer>): void;
    getByteTimeDomainData(array: Uint8Array<ArrayBuffer>): void;
    getFloatFrequencyData(array: Float32Array<ArrayBuffer>): void;
  }
>;
