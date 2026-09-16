import {
  registerGlobals,
  AudioSession,
  AndroidAudioTypePresets,
} from "@livekit/react-native";
import type { Options } from "@elevenlabs/client";
import {
  setSetupStrategy,
  createConnection,
  setupWebRTCSession,
  type VoiceSessionSetupResult,
} from "@elevenlabs/client/internal";
import { attachNativeVolume } from "./nativeVolume.js";
import { resolveAndroidPreferredOutputList } from "./audioSession.js";

// Polyfill WebRTC globals needed by livekit-client in React Native
registerGlobals();

/**
 * React Native voice session setup strategy.
 *
 * 1. Configures and starts the native AudioSession
 * 2. Creates a WebRTC connection and extracts its I/O controllers
 * 3. Wraps input/output controllers with native volume processors
 * 4. Wraps detach to stop the native AudioSession on cleanup
 *
 * Only WebRTC connections are supported on React Native.
 * WebSocket connections require Web Audio APIs (AudioContext,
 * AudioWorkletNode) that are not available in React Native.
 */
async function reactNativeSessionSetup(
  options: Options
): Promise<VoiceSessionSetupResult> {
  if (options.connectionType === "websocket" || options.signedUrl) {
    throw new Error(
      "WebSocket connections are not supported on React Native. " +
        "Only WebRTC connections are available. " +
        "Remove the connectionType/signedUrl option or use connectionType: 'webrtc'."
    );
  }

  const audioSessionOverrides = options.webRtc?.reactNative?.audioSession;
  await AudioSession.configureAudio({
    android: {
      // Defaults to bluetooth > headset > speaker > earpiece, so a connected
      // Bluetooth or wired headset is used automatically instead of always
      // forcing the speaker. Callers who want a different order can ask for
      // one explicitly. The list is always sent, never omitted; see
      // resolveAndroidPreferredOutputList for why.
      preferredOutputList: resolveAndroidPreferredOutputList(
        audioSessionOverrides?.android?.preferredOutputList
      ),
      audioTypeOptions: AndroidAudioTypePresets.communication,
    },
    ios: {
      defaultOutput: audioSessionOverrides?.ios?.defaultOutput ?? "speaker",
    },
  });
  await AudioSession.startAudioSession();

  const connection = await createConnection(options);
  const result = attachNativeVolume(setupWebRTCSession(connection));

  const originalDetach = result.detach;
  return {
    ...result,
    detach: async () => {
      try {
        await originalDetach();
      } finally {
        await AudioSession.stopAudioSession();
      }
    },
  };
}

setSetupStrategy(reactNativeSessionSetup);

export * from "./index.js";
