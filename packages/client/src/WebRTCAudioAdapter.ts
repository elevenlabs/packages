import type { RemoteAudioTrack } from "livekit-client";
import type { FormatConfig } from "./utils/BaseConnection.js";
import type { VolumeProvider } from "./utils/volumeProvider.js";

/**
 * Result of setting up input (microphone) volume analysis.
 */
export type InputAnalysisResult = {
  volumeProvider: VolumeProvider;
  /** AnalyserNode on web; undefined on other platforms. */
  analyser?: unknown;
};

/**
 * Result of setting up output (agent audio) analysis and capture.
 */
export type OutputAnalysisResult = {
  volumeProvider: VolumeProvider;
  /** AnalyserNode on web; undefined on other platforms. */
  analyser?: unknown;
};

/**
 * Abstracts platform-specific audio behaviour used by WebRTCConnection.
 *
 * - **Web:** AudioContext, HTMLAudioElement, AudioWorkletNode
 * - **React Native:** no-op (LiveKit handles playback natively;
 *   volume comes from `setInputVolumeProvider`/`setOutputVolumeProvider`)
 * - **Default (no adapter):** NO_VOLUME, no playback setup
 */
export interface WebRTCAudioAdapter {
  /**
   * Attach a remote audio track for playback.
   * Web: creates HTMLAudioElement via `track.attach()` and appends to DOM.
   */
  attachRemoteTrack(
    track: RemoteAudioTrack,
    outputDeviceId: string | null
  ): Promise<void>;

  /**
   * Set up input volume analysis from the local mic MediaStreamTrack.
   * Called once after mic is enabled and again after input device switches.
   * Implementations must clean up previous resources on re-call.
   */
  setupInputAnalysis(mediaStreamTrack: MediaStreamTrack): InputAnalysisResult;

  /**
   * Set up output volume analysis and raw audio capture from a remote track.
   * @param onAudioData Called with captured audio data for the `onAudio` callback.
   */
  setupOutputAnalysis(
    track: RemoteAudioTrack,
    format: FormatConfig,
    onAudioData: (audioData: ArrayBuffer, maxVolume: number) => void
  ): Promise<OutputAnalysisResult>;

  /** Set playback volume (0-1) for all managed audio elements. */
  setVolume(volume: number): void;

  /** Route audio output to the specified device. */
  setOutputDevice(deviceId: string): Promise<void>;

  /** Release all resources (AudioContexts, audio elements, etc.). */
  cleanup(): void;
}

// ---------------------------------------------------------------------------
// Module-level factory for platform injection
// ---------------------------------------------------------------------------

let audioAdapterFactory: (() => WebRTCAudioAdapter) | undefined;

/**
 * Register a factory that creates a {@link WebRTCAudioAdapter} for each
 * new WebRTC connection. Called by platform-specific entrypoints
 * (e.g. `platform/web/index.ts`).
 */
export function setWebRTCAudioAdapterFactory(
  factory: () => WebRTCAudioAdapter
): void {
  audioAdapterFactory = factory;
}

/** @internal Create an adapter using the registered factory, or null. */
export function createAudioAdapter(): WebRTCAudioAdapter | null {
  return audioAdapterFactory?.() ?? null;
}
