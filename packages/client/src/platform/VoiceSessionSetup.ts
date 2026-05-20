import type { Options } from "../BaseConversation.js";
import type { BaseConnection } from "../utils/BaseConnection.js";
import type { InputController } from "../InputController.js";
import type { OutputController } from "../OutputController.js";
import type { PlaybackEventTarget } from "../OutputController.js";
import { WebRTCConnection } from "../utils/WebRTCConnection.js";

export type VoiceSessionSetupResult = {
  connection: BaseConnection;
  input: InputController;
  output: OutputController;
  playbackEventTarget: PlaybackEventTarget | null;
  detach: () => Promise<void>;
};

export type VoiceSessionSetupStrategy = (
  options: Options
) => Promise<VoiceSessionSetupResult>;

/**
 * The active session setup strategy.
 * Defaults to undefined — set by platform-specific entrypoints on import.
 */
export let setupStrategy: VoiceSessionSetupStrategy | undefined;

/**
 * Override the voice session setup strategy.
 * Called by platform-specific entrypoints to inject their own setup handling.
 */
export function setSetupStrategy(strategy: VoiceSessionSetupStrategy) {
  setupStrategy = strategy;
}

/**
 * Sets up a voice session for a WebRTC connection.
 * Platform-agnostic: extracts the input/output controllers that
 * WebRTCConnection already provides via LiveKit.
 */
export function setupWebRTCSession(
  connection: BaseConnection
): VoiceSessionSetupResult {
  if (!(connection instanceof WebRTCConnection)) {
    throw new Error(
      "setupWebRTCSession requires a WebRTCConnection. " +
        `Received: ${connection?.constructor?.name ?? typeof connection}`
    );
  }
  return {
    connection,
    input: connection.input,
    output: connection.output,
    playbackEventTarget: null,
    detach: async () => {},
  };
}
