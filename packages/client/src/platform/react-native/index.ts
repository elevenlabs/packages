import {
  registerGlobals,
  AudioSession,
  AndroidAudioTypePresets,
} from "@livekit/react-native";
import { setSetupStrategy, webSessionSetup } from "../VoiceSessionSetup";
import type { VoiceSessionSetupResult } from "../VoiceSessionSetup";
import type { Options } from "../../BaseConversation";
import type { BaseConnection } from "../../utils/BaseConnection";

registerGlobals();

/**
 * React Native voice session setup strategy.
 *
 * Configures and starts the native AudioSession (required for the polyfilled
 * DOM audio APIs to work), then delegates to the standard web setup strategy.
 * On cleanup, stops the native AudioSession.
 */
async function reactNativeSessionSetup(
  options: Options,
  connection: BaseConnection
): Promise<VoiceSessionSetupResult> {
  // Configure and start native audio session before using audio APIs
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

  const result = await webSessionSetup(options, connection);

  // Wrap detach to also stop the native audio session
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

export * from "../../index";
