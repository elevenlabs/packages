import {
  registerGlobals,
  AudioSession,
  AndroidAudioTypePresets,
} from "@livekit/react-native";
import { setSetupStrategy, webSessionSetup } from "../VoiceSessionSetup";
import type { VoiceSessionSetupResult } from "../VoiceSessionSetup";
import type { Options } from "../../BaseConversation";

registerGlobals();

/**
 * React Native voice session setup strategy.
 *
 * 1. Configures and starts the native AudioSession
 * 2. Delegates connection + input/output setup to the web strategy
 * 3. Wraps detach to stop the native AudioSession on cleanup
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

  const result = await webSessionSetup(options);

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
