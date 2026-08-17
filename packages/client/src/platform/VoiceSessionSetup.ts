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
 * Detects a React Native runtime.
 *
 * `navigator.product === "ReactNative"` is the long-standing signal; Hermes,
 * the default engine on modern React Native, exposes a `HermesInternal` global.
 * Either is enough, and both are absent in a browser.
 */
function isReactNativeEnvironment(): boolean {
  const globals = globalThis as {
    navigator?: { product?: string };
    HermesInternal?: unknown;
  };
  return (
    globals.navigator?.product === "ReactNative" ||
    globals.HermesInternal != null
  );
}

/**
 * Returns the registered setup strategy, or throws explaining how to register
 * one. On React Native the fix is to import `@elevenlabs/react-native`, which
 * polyfills the WebRTC globals, configures the native audio session and
 * registers its own strategy — pointing at the browser entry point there would
 * be actively wrong.
 */
export function ensureSetupStrategy(): VoiceSessionSetupStrategy {
  if (setupStrategy) {
    return setupStrategy;
  }
  throw new Error(
    isReactNativeEnvironment()
      ? "No voice session setup strategy registered. It looks like you're using " +
          "@elevenlabs/client in React Native without importing @elevenlabs/react-native. " +
          'Add `import "@elevenlabs/react-native";` before any other ElevenLabs imports.'
      : "No voice session setup strategy registered. " +
          'Import the platform-specific entry point (e.g. @elevenlabs/client via the "browser" export).'
  );
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
