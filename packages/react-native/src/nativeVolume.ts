import { NativeModules, NativeEventEmitter } from "react-native";
import { WebRTCConnection, type VolumeProvider } from "@elevenlabs/client";
import type { VoiceSessionSetupResult } from "@elevenlabs/client/internal";

const LiveKitModule = NativeModules.LivekitReactNativeModule;

let emitter: NativeEventEmitter | null = null;
function getEmitter(): NativeEventEmitter {
  emitter ??= new NativeEventEmitter(LiveKitModule);
  return emitter;
}

interface VolumeEvent {
  id: string;
  volume: number;
}

function createNativeVolumeProvider(): {
  provider: VolumeProvider;
  setVolume: (v: number) => void;
} {
  let volume = 0;
  return {
    provider: {
      getVolume: () => volume,
      getByteFrequencyData: (buffer: Uint8Array<ArrayBuffer>) =>
        buffer.fill(Math.round(volume * 255)),
    },
    setVolume: v => {
      volume = v;
    },
  };
}

/**
 * Sets up native volume processors for the WebRTC connection and installs
 * VolumeProvider instances that feed their values through to the controllers.
 * Returns a cleanup function.
 */
function setupNativeVolumeProcessors(connection: WebRTCConnection): () => void {
  const room = connection.getRoom();
  const subscriptions: Array<{ remove: () => void }> = [];
  const reactTags: Array<{ tag: string; track: any }> = [];

  // --- Input (local mic track) ---
  const micPub = room.localParticipant.audioTrackPublications.values().next();
  const micTrack = micPub.done ? undefined : micPub.value?.track;
  if (micTrack) {
    const mst = micTrack.mediaStreamTrack as any;
    const pcId: number = mst._peerConnectionId ?? -1;
    const tag: string = LiveKitModule.createVolumeProcessor(pcId, mst.id);
    reactTags.push({ tag, track: micTrack });

    const input = createNativeVolumeProvider();
    connection.setInputVolumeProvider(input.provider);

    subscriptions.push(
      getEmitter().addListener("LK_VOLUME_PROCESSED", (event: VolumeEvent) => {
        if (event.id === tag) {
          input.setVolume(event.volume);
        }
      })
    );
  }

  // --- Output (remote agent track) ---
  let outputSetUp = false;

  function setupOutputTrack(track: any) {
    if (outputSetUp) return;
    outputSetUp = true;
    const mst = track.mediaStreamTrack as any;
    const pcId: number = mst._peerConnectionId ?? -1;
    const tag: string = LiveKitModule.createVolumeProcessor(pcId, mst.id);
    reactTags.push({ tag, track });

    const output = createNativeVolumeProvider();
    connection.setOutputVolumeProvider(output.provider);

    subscriptions.push(
      getEmitter().addListener("LK_VOLUME_PROCESSED", (event: VolumeEvent) => {
        if (event.id === tag) {
          output.setVolume(event.volume);
        }
      })
    );
  }

  // Check for an existing remote audio track from the agent
  for (const participant of room.remoteParticipants.values()) {
    if (participant.identity?.includes("agent")) {
      for (const pub of participant.audioTrackPublications.values()) {
        if (pub.track) {
          setupOutputTrack(pub.track);
          break;
        }
      }
    }
  }

  // Listen for future track subscriptions
  const trackHandler = (track: any, _publication: any, participant: any) => {
    if (track.kind === "audio" && participant?.identity?.includes("agent")) {
      setupOutputTrack(track);
    }
  };
  room.on("trackSubscribed", trackHandler);

  return () => {
    room.off("trackSubscribed", trackHandler);
    for (const { tag, track } of reactTags) {
      const mst = track.mediaStreamTrack as any;
      LiveKitModule.deleteVolumeProcessor(
        tag,
        mst._peerConnectionId ?? -1,
        mst.id
      );
    }
    for (const sub of subscriptions) {
      sub.remove();
    }
  };
}

/**
 * Attaches native volume processors to the WebRTC connection so that
 * `getInputVolume()` / `getOutputVolume()` return real values on
 * React Native. Falls through unchanged for non-WebRTC connections;
 * WebSocket volume on React Native is a known gap (MediaDeviceInput/
 * MediaDeviceOutput depend on AudioContext which is unavailable in RN).
 */
export function attachNativeVolume(
  result: VoiceSessionSetupResult
): VoiceSessionSetupResult {
  if (!(result.connection instanceof WebRTCConnection)) {
    return result;
  }

  const cleanup = setupNativeVolumeProcessors(result.connection);

  const originalDetach = result.detach;
  return {
    ...result,
    detach: () => {
      cleanup();
      originalDetach();
    },
  };
}
