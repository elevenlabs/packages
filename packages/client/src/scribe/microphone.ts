/**
 * Platform-agnostic microphone streaming interface for Scribe.
 *
 * The web implementation (`platform/web/scribeMicrophone.ts`) provides the
 * actual AudioContext + getUserMedia pipeline; other platforms can supply
 * their own implementation via `setScribeMicrophoneSetup`.
 */

import { missingRegistrationError } from "../platform/diagnostics.js";

export interface ScribeMicrophoneConfig {
  deviceId?: MediaDeviceConstraint;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  channelCount?: number;
  /**
   * Allows self-hosting the Scribe audio worklet to avoid whitelisting
   * blob: and data: URLs in the CSP script-src (or script-src-elem)
   * directive. Point this at a same-origin copy of the processor shipped
   * at `@elevenlabs/client/worklets/scribeAudioProcessor.js`.
   */
  workletPaths?: {
    scribeAudioProcessor?: string;
  };
}

export interface ScribeMicrophoneResult {
  /** Track reference so the connection can toggle `track.enabled` for mute/unmute. */
  mediaStreamTrack: MediaStreamTrack;
  /** Tear down the audio pipeline and release hardware. */
  cleanup: () => void;
}

/**
 * Sets up microphone capture and streams PCM audio to the provided callback.
 *
 * @param config - Microphone constraints
 * @param onAudioData - Called with base64-encoded PCM16 chunks
 * @returns A result containing the track and cleanup function
 */
export type ScribeMicrophoneSetup = (
  config: ScribeMicrophoneConfig,
  onAudioData: (base64Audio: string) => void
) => Promise<ScribeMicrophoneResult>;

// ---------------------------------------------------------------------------
// Injectable factory
// ---------------------------------------------------------------------------

let microphoneSetup: ScribeMicrophoneSetup | null = null;

export function setScribeMicrophoneSetup(setup: ScribeMicrophoneSetup): void {
  microphoneSetup = setup;
}

export function getScribeMicrophoneSetup(): ScribeMicrophoneSetup {
  if (!microphoneSetup) {
    throw missingRegistrationError("Scribe microphone implementation");
  }
  return microphoneSetup;
}
