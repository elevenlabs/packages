import {
  registerGlobals,
  AudioSession,
  AndroidAudioTypePresets,
} from "@livekit/react-native";
import type { Options } from "@elevenlabs/client";
import {
  setSetupStrategy,
  webSessionSetup,
  type VoiceSessionSetupResult,
} from "@elevenlabs/client/internal";
import { attachNativeVolume } from "./nativeVolume.js";

// Polyfill WebRTC globals needed by livekit-client in React Native
registerGlobals();

/**
 * React Native voice session setup strategy.
 *
 * 1. Configures and starts the native AudioSession
 * 2. Delegates connection + input/output setup to the web strategy
 * 3. Wraps input/output controllers with native volume processors
 * 4. Wraps detach to stop the native AudioSession on cleanup
 */
async function reactNativeSessionSetup(
  options: Options
): Promise<VoiceSessionSetupResult> {
  await AudioSession.configureAudio({
    android: {
      preferredOutputList: ["speaker"],
      audioTypeOptions: AndroidAudioTypePresets.communication,
    },
    ios: {
      defaultOutput: "speaker",
    },
  });
  await AudioSession.startAudioSession();

  const result = attachNativeVolume(await webSessionSetup(options));

  const originalDetach = result.detach;
  return {
    ...result,
    detach: () => {
      originalDetach();
      AudioSession.stopAudioSession();
    },
  };
}

setSetupStrategy(reactNativeSessionSetup);

export * from "./index.js";
