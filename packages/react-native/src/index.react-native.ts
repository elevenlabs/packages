import {
  registerGlobals,
  AudioSession,
  AndroidAudioTypePresets,
} from "@livekit/react-native";
import type { Options } from "@elevenlabs/client";
import {
  setSetupStrategy,
  webSessionSetup,
  createConnection,
  attachInputToConnection,
  attachConnectionToOutput,
  type VoiceSessionSetupResult,
} from "@elevenlabs/client/internal";
import { AudioManager } from "react-native-audio-api";
import { ReactNativeInputForWebSocket } from "./ReactNativeInputForWebSocket";
import { ReactNativeOutputForWebSocket } from "./ReactNativeOutputForWebSocket";

// Polyfill WebRTC globals needed by livekit-client in React Native
registerGlobals();

/**
 * React Native voice session setup strategy.
 *
 * For WebRTC: configures LiveKit AudioSession and delegates to the shared
 * setupInputOutput helper (LiveKit handles audio natively).
 *
 * For WebSocket: uses react-native-audio-api for both input (AudioRecorder)
 * and output (AudioBufferQueueSourceNode), since the web AudioContext/AudioWorklet
 * APIs are not available in React Native.
 */
async function reactNativeSessionSetup(
  options: Options
): Promise<VoiceSessionSetupResult> {
  if (options.connectionType === "websocket") {
    const connection = await createConnection({
      ...options,
      connectionType: "websocket",
    });
    const input = await ReactNativeInputForWebSocket.create(
      connection.inputFormat
    );
    const output = await ReactNativeOutputForWebSocket.create(
      connection.outputFormat
    );
    const detachInput = attachInputToConnection(input, connection);
    const detachOutput = attachConnectionToOutput(connection, output);

    return {
      connection,
      input,
      output,
      playbackEventTarget: output,
      detach: () => {
        detachInput();
        detachOutput();
        AudioManager.setAudioSessionActivity(false);
      },
    };
  } else {
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
}

setSetupStrategy(reactNativeSessionSetup);

export * from "./index";
