import {
  registerGlobals,
  AudioSession,
  AndroidAudioTypePresets,
} from "@livekit/react-native";
import { Platform } from "react-native";
import type { Options } from "@elevenlabs/client";
import { WebRTCConnection } from "@elevenlabs/client";
import {
  setSetupStrategy,
  createConnection,
  setupWebRTCSession,
  type VoiceSessionSetupResult,
} from "@elevenlabs/client/internal";
import { attachNativeVolume } from "./nativeVolume.js";

// Polyfill WebRTC globals needed by livekit-client in React Native
registerGlobals();

/**
 * iOS: re-arm the RTCAudioSession input capture unit after AVAudioSession
 * reactivation.
 *
 * On a second (or subsequent) sequential WebRTC call, the
 * `startAudioSession()` → LiveKit mic-publish sequence can leave the
 * hardware input tap stalled — the track is live and unmuted at the WebRTC
 * level but its total audio energy is zero (see issue #991).
 *
 * A mute → unmute cycle forces LiveKit's native RTCAudioSession to call
 * `setRecordingEnabled:YES` again, which reliably restarts the capture unit.
 * This is the same recovery step that a manual mute/unmute triggers.
 */
async function iosRearmMicrophone(connection: WebRTCConnection): Promise<void> {
  const room = connection.getRoom();
  await room.localParticipant.setMicrophoneEnabled(false);
  await room.localParticipant.setMicrophoneEnabled(true);
}

/**
 * React Native voice session setup strategy.
 *
 * 1. Configures and starts the native AudioSession
 * 2. Creates a WebRTC connection and extracts its I/O controllers
 * 3. On iOS, re-arms the RTCAudioSession input tap to fix silent-mic on
 *    repeated sessions (issue #991)
 * 4. Wraps input/output controllers with native volume processors
 * 5. Wraps detach to stop the native AudioSession on cleanup
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

  const connection = await createConnection(options);

  // iOS only: re-arm the audio capture unit before the session goes live.
  // This is a no-op for text-only sessions (no mic track is published).
  if (Platform.OS === "ios" && !options.textOnly) {
    if (connection instanceof WebRTCConnection) {
      try {
        await iosRearmMicrophone(connection);
      } catch (e) {
        // Non-fatal: if re-arming fails the session continues. The user may
        // experience the silent-capture issue on this particular call.
        console.warn("[ElevenLabs] iOS mic re-arm failed:", e);
      }
    }
  }

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
