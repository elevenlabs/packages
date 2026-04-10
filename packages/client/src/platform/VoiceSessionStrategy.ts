import type { Options } from "../BaseConversation.js";
import type { BaseConnection } from "../utils/BaseConnection.js";
import type { InputController } from "../InputController.js";
import type { OutputController } from "../OutputController.js";
import type { PlaybackEventTarget } from "../utils/output.js";

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
 * Set to the web strategy by the main `@elevenlabs/client` entry point.
 * Can be overridden by platform-specific entrypoints (e.g. React Native).
 */
export let setupStrategy: VoiceSessionSetupStrategy = () => {
  throw new Error(
    "No voice session setup strategy configured. " +
      "Import @elevenlabs/client or call setSetupStrategy() first."
  );
};

/**
 * Override the voice session setup strategy.
 * Called by platform-specific entrypoints to inject their own setup handling.
 */
export function setSetupStrategy(strategy: VoiceSessionSetupStrategy) {
  setupStrategy = strategy;
}
