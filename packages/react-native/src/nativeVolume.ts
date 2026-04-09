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

interface MultibandEvent {
  id: string;
  magnitudes: number[];
}

const MULTIBAND_FREQUENCY_OPTIONS = {
  minFrequency: 100,
  maxFrequency: 8000,
  updateInterval: 40,
};

/**
 * A VolumeProvider backed by native LiveKit audio processors.
 *
 * Both processors are created lazily: the RMS volume processor on the first
 * `getVolume()` call, and the FFT multiband processor on the first
 * `getByteFrequencyData()` call (with its band count matching the buffer
 * length). If the buffer size changes, the multiband processor is recreated.
 */
class NativeVolumeProvider implements VolumeProvider {
  private volume = 0;
  private magnitudes: number[] = [];

  // Volume processor state (lazy)
  private volumeTag: string | null = null;
  private volumeSub: { remove: () => void } | null = null;

  // Multiband processor state (lazy)
  private multibandTag: string | null = null;
  private multibandSub: { remove: () => void } | null = null;
  private currentBands = 0;

  constructor(
    private pcId: number,
    private trackId: string
  ) {}

  /**
   * Rebinds this provider to a new track, cleaning up any existing native
   * processors so they are lazily recreated against the new track.
   */
  updateTrack(pcId: number, trackId: string) {
    this.cleanupProcessors();
    this.pcId = pcId;
    this.trackId = trackId;
    this.volume = 0;
    this.magnitudes = [];
  }

  private ensureVolumeProcessor() {
    if (this.volumeTag) return;
    this.volumeTag = LiveKitModule.createVolumeProcessor(
      this.pcId,
      this.trackId
    );
    this.volumeSub = getEmitter().addListener(
      "LK_VOLUME_PROCESSED",
      (event: VolumeEvent) => {
        if (event.id === this.volumeTag) {
          this.volume = event.volume;
        }
      }
    );
  }

  private ensureMultibandProcessor(bands: number) {
    if (bands === this.currentBands) return;

    // Cleanup previous processor
    if (this.multibandTag) {
      LiveKitModule.deleteMultibandVolumeProcessor(
        this.multibandTag,
        this.pcId,
        this.trackId
      );
      this.multibandSub?.remove();
    }

    this.currentBands = bands;
    this.magnitudes = [];
    this.multibandTag = LiveKitModule.createMultibandVolumeProcessor(
      { ...MULTIBAND_FREQUENCY_OPTIONS, bands },
      this.pcId,
      this.trackId
    );
    this.multibandSub = getEmitter().addListener(
      "LK_MULTIBAND_PROCESSED",
      (event: MultibandEvent) => {
        if (event.id === this.multibandTag) {
          this.magnitudes = event.magnitudes;
        }
      }
    );
  }

  getVolume(): number {
    this.ensureVolumeProcessor();
    return this.volume < 0 ? 0 : this.volume > 1 ? 1 : this.volume;
  }

  getByteFrequencyData(buffer: Uint8Array<ArrayBuffer>): void {
    this.ensureMultibandProcessor(buffer.length);
    if (this.magnitudes.length === 0) {
      // No multiband data yet; fall back to uniform fill from RMS volume
      this.ensureVolumeProcessor();
      const clamped = this.volume < 0 ? 0 : this.volume > 1 ? 1 : this.volume;
      buffer.fill(Math.round(clamped * 255));
      return;
    }
    for (let i = 0; i < buffer.length; i++) {
      const m = this.magnitudes[i] ?? 0;
      buffer[i] = Math.round((m < 0 ? 0 : m > 1 ? 1 : m) * 255);
    }
  }

  private cleanupProcessors() {
    if (this.volumeTag) {
      LiveKitModule.deleteVolumeProcessor(
        this.volumeTag,
        this.pcId,
        this.trackId
      );
      this.volumeSub?.remove();
      this.volumeTag = null;
      this.volumeSub = null;
    }
    if (this.multibandTag) {
      LiveKitModule.deleteMultibandVolumeProcessor(
        this.multibandTag,
        this.pcId,
        this.trackId
      );
      this.multibandSub?.remove();
      this.multibandTag = null;
      this.multibandSub = null;
      this.currentBands = 0;
    }
  }

  cleanup() {
    this.cleanupProcessors();
  }
}

/**
 * Sets up lazy native volume providers for the WebRTC connection. No native
 * processors are created until `getVolume()` or `getByteFrequencyData()` is
 * actually called. Returns a cleanup function.
 */
function setupNativeVolumeProcessors(connection: WebRTCConnection): () => void {
  const room = connection.getRoom();
  const providers: NativeVolumeProvider[] = [];

  // --- Input (local mic track) ---
  let inputProvider: NativeVolumeProvider | null = null;

  function setupInputTrack(track: any) {
    const mst = track.mediaStreamTrack as any;
    const pcId: number = mst._peerConnectionId ?? -1;
    if (inputProvider) {
      inputProvider.updateTrack(pcId, mst.id);
    } else {
      inputProvider = new NativeVolumeProvider(pcId, mst.id);
      providers.push(inputProvider);
      connection.setInputVolumeProvider(inputProvider);
    }
  }

  const micPub = room.localParticipant.audioTrackPublications.values().next();
  const micTrack = micPub.done ? undefined : micPub.value?.track;
  if (micTrack) {
    setupInputTrack(micTrack);
  }

  // Re-bind the input provider when the local mic track is republished
  // (e.g. after setAudioInputDevice)
  const localTrackHandler = (publication: any) => {
    if (publication.track?.kind === "audio") {
      setupInputTrack(publication.track);
    }
  };
  room.on("localTrackPublished", localTrackHandler);

  // --- Output (remote agent track) ---
  let outputProvider: NativeVolumeProvider | null = null;

  function setupOutputTrack(track: any) {
    const mst = track.mediaStreamTrack as any;
    const pcId: number = mst._peerConnectionId ?? -1;
    if (outputProvider) {
      outputProvider.updateTrack(pcId, mst.id);
    } else {
      outputProvider = new NativeVolumeProvider(pcId, mst.id);
      providers.push(outputProvider);
      connection.setOutputVolumeProvider(outputProvider);
    }
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
    room.off("localTrackPublished", localTrackHandler);
    room.off("trackSubscribed", trackHandler);
    for (const provider of providers) {
      provider.cleanup();
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
