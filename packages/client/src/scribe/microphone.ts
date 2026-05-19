/**
 * Platform-agnostic microphone streaming interface for Scribe.
 *
 * The web implementation (`platform/web/scribeMicrophone.ts`) provides the
 * actual AudioContext + getUserMedia pipeline; other platforms can supply
 * their own implementation via `setScribeMicrophoneSetup`.
 */

export interface ScribeMicrophoneConfig {
  deviceId?: string;
  echoCancellation?: boolean;
  noiseSuppression?: boolean;
  autoGainControl?: boolean;
  channelCount?: number;
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
    throw new Error(
      "No Scribe microphone implementation registered. " +
        "Import '@elevenlabs/client/platform/web' or provide a custom " +
        "implementation via setScribeMicrophoneSetup()."
    );
  }
  return microphoneSetup;
}
