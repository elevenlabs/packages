import type { Options } from "../BaseConversation.js";
import type { BaseConnection } from "../utils/BaseConnection.js";
import type { InputController } from "../InputController.js";
import type { OutputController } from "../OutputController.js";
import type { PlaybackEventTarget } from "../OutputController.js";

export type VoiceSessionSetupResult = {
  connection: BaseConnection;
  input: InputController;
  output: OutputController;
  playbackEventTarget: PlaybackEventTarget | null;
  detach: () => void;
};

export type VoiceSessionSetupStrategy = (
  options: Options
) => Promise<VoiceSessionSetupResult>;

/**
 * The active session setup strategy.
 * Defaults to undefined — set by platform-specific entrypoints.
 * The web entrypoint sets this to `webSessionSetup` on import.
 */
export let setupStrategy: VoiceSessionSetupStrategy | undefined;

/**
 * Override the voice session setup strategy.
 * Called by platform-specific entrypoints to inject their own setup handling.
 */
export function setSetupStrategy(strategy: VoiceSessionSetupStrategy) {
  setupStrategy = strategy;
}
