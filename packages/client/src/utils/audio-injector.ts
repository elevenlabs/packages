import { base64ToArrayBuffer, int16ArrayToBase64, resamplePCM } from "./audio";
import type { BaseConnection } from "./BaseConnection";
import { WebRTCConnection } from "./WebRTCConnection";
import { WebSocketConnection } from "./WebSocketConnection";
import { Track } from "livekit-client";

/** Default sample rate assumed for injected audio when the caller doesn't specify one. */
const DEFAULT_INJECT_SAMPLE_RATE = 48000;

/** WebRTC uses 48 kHz natively; LiveKit tracks expect this rate. */
const WEBRTC_SAMPLE_RATE = 48000;

/** Int16 PCM range is [-32768, 32767]. Used to convert between Int16 and Float32. */
const INT16_MAX = 32768;

/** Interval at which the playback loop checks for cancellation. */
const CANCEL_POLL_MS = 100;

interface Injection {
  cancelled: boolean;
  cleanup?: () => void;
}

type DebugLog = (...args: unknown[]) => void;

/**
 * Encapsulates audio injection into an active conversation.
 *
 * Supports both WebSocket (chunked PCM) and WebRTC (track replacement on
 * LiveKit) transports. Only one injection can be active at a time; starting
 * a new injection automatically cancels any in-flight one.
 */
export class AudioInjector {
  private active: Injection | null = null;

  /** Whether an injection is currently in progress. */
  get isInjecting(): boolean {
    return this.active !== null;
  }

  /** Cancel the current injection (if any) and clean up resources. */
  cancel(): void {
    if (this.active) {
      this.active.cancelled = true;
      this.active.cleanup?.();
      this.active = null;
    }
  }

  /**
   * Inject pre-recorded audio into the conversation.
   *
   * @returns A handle with a `cancel` function that stops injection early.
   */
  async inject(
    base64Audio: string,
    connection: BaseConnection,
    opts: {
      sourceSampleRate?: number;
      isConnected: () => boolean;
      debugLog?: DebugLog;
    }
  ): Promise<{ cancel: () => void }> {
    if (!opts.isConnected()) {
      throw new Error("Not connected to a conversation");
    }

    this.cancel();

    const injection: Injection = { cancelled: false };
    this.active = injection;

    const cancel = () => {
      injection.cancelled = true;
      injection.cleanup?.();
    };

    if (connection instanceof WebRTCConnection) {
      await this.injectWebRTC(
        base64Audio,
        connection,
        injection,
        opts.debugLog
      );
    } else if (connection instanceof WebSocketConnection) {
      await this.injectWebSocket(
        base64Audio,
        opts.sourceSampleRate ?? DEFAULT_INJECT_SAMPLE_RATE,
        connection,
        injection,
        opts.isConnected
      );
    } else {
      throw new Error("Unknown connection type");
    }

    if (this.active === injection) {
      this.active = null;
    }

    return { cancel };
  }

  /**
   * Sends audio over a WebSocket connection in real-time PCM chunks that
   * match the mic worklet's cadence (sampleRate / 10 = 100 ms per chunk).
   */
  private async injectWebSocket(
    base64Audio: string,
    sourceSampleRate: number,
    connection: WebSocketConnection,
    injection: Injection,
    isConnected: () => boolean
  ) {
    const bytes = base64ToArrayBuffer(base64Audio);
    const pcmData = new Int16Array(bytes);
    const targetSampleRate = connection.inputFormat.sampleRate;

    let finalPcm: Int16Array = pcmData;
    if (sourceSampleRate !== targetSampleRate) {
      finalPcm = resamplePCM(pcmData, sourceSampleRate, targetSampleRate);
    }

    const samplesPerChunk = Math.floor(targetSampleRate / 10);
    const msPerChunk = 100;
    const startTime = performance.now();

    for (
      let i = 0, chunkIndex = 0;
      i < finalPcm.length;
      i += samplesPerChunk, chunkIndex++
    ) {
      if (injection.cancelled || !isConnected()) return;

      const chunk = finalPcm.slice(
        i,
        Math.min(i + samplesPerChunk, finalPcm.length)
      );
      const chunkBase64 = int16ArrayToBase64(chunk);

      connection.sendMessage({ user_audio_chunk: chunkBase64 });

      const nextChunkTime = startTime + (chunkIndex + 1) * msPerChunk;
      const sleepMs = nextChunkTime - performance.now();
      if (sleepMs > 1) {
        await new Promise(r => setTimeout(r, sleepMs));
      }
    }
  }

  /**
   * Injects audio into a WebRTC (LiveKit) connection by swapping the mic
   * track on the publisher's RTCRtpSender. Falls back to
   * unpublishing/republishing if the sender isn't available.
   */
  private async injectWebRTC(
    base64Audio: string,
    connection: WebRTCConnection,
    injection: Injection,
    debugLog?: DebugLog
  ) {
    const log: DebugLog = debugLog ?? (() => {});

    const room = connection.getRoom();
    if (!room || room.state !== "connected") {
      throw new Error("LiveKit room not connected");
    }

    const bytes = base64ToArrayBuffer(base64Audio);
    const int16Data = new Int16Array(bytes);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / INT16_MAX;
    }

    const sampleRate = WEBRTC_SAMPLE_RATE;
    const durationSeconds = float32Data.length / sampleRate;
    log(
      `[injectAudioWebRTC] Preparing ${durationSeconds.toFixed(2)}s of audio (${int16Data.length} samples @ ${sampleRate}Hz)`
    );

    const audioContext = new AudioContext({ sampleRate });
    const audioBuffer = audioContext.createBuffer(
      1,
      float32Data.length,
      sampleRate
    );
    audioBuffer.copyToChannel(float32Data, 0);

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;

    const destination = audioContext.createMediaStreamDestination();
    source.connect(destination);

    const newAudioTrack = destination.stream.getAudioTracks()[0];

    const cleanupResources = () => {
      try {
        source.stop();
      } catch (_) {}
      try {
        audioContext.close();
      } catch (_) {}
      try {
        newAudioTrack.stop();
      } catch (_) {}
    };

    const micPub = room.localParticipant?.getTrackPublication(
      Track.Source.Microphone
    );
    if (micPub?.track) {
      const originalMicTrack = micPub.track.mediaStreamTrack;

      const publisher = room.engine.pcManager?.publisher;
      const sender = publisher
        ?.getSenders()
        .find((s: RTCRtpSender) => s.track === originalMicTrack);

      if (sender) {
        log(
          "[injectAudioWebRTC] Primary path: replacing mic track on RTCRtpSender"
        );
        source.start(0);
        await sender.replaceTrack(newAudioTrack);

        injection.cleanup = () => {
          log("[injectAudioWebRTC] Cancelled — restoring original mic track");
          sender.replaceTrack(originalMicTrack).catch(() => {});
          cleanupResources();
        };

        const totalMs = durationSeconds * 1000;
        let elapsed = 0;
        while (elapsed < totalMs) {
          if (injection.cancelled) return;
          await new Promise(r => setTimeout(r, CANCEL_POLL_MS));
          elapsed += CANCEL_POLL_MS;
        }

        log(
          "[injectAudioWebRTC] Playback complete — restoring original mic track"
        );
        await sender.replaceTrack(originalMicTrack);
        cleanupResources();
        injection.cleanup = undefined;
        return;
      } else if (!publisher) {
        console.warn(
          "[injectAudioWebRTC] Publisher transport not available on pcManager — falling back to republish"
        );
      } else {
        console.warn(
          "[injectAudioWebRTC] RTCRtpSender for mic track not found — falling back to republish"
        );
      }
    } else {
      console.warn(
        "[injectAudioWebRTC] No published mic track found — falling back to republish"
      );
    }

    log(
      "[injectAudioWebRTC] Fallback path: publishing injected audio as new track"
    );
    if (micPub) {
      await room.localParticipant.unpublishTrack(micPub.track!);
    }

    const publication = await room.localParticipant.publishTrack(
      newAudioTrack,
      {
        name: "injected-audio",
        source: Track.Source.Microphone,
      }
    );

    source.start(0);

    injection.cleanup = async () => {
      log(
        "[injectAudioWebRTC] Cancelled — unpublishing injected track, re-enabling mic"
      );
      try {
        await room.localParticipant.unpublishTrack(publication.track!);
      } catch (_) {}
      cleanupResources();
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
      } catch (_) {}
    };

    const totalMs = durationSeconds * 1000;
    let elapsed = 0;
    while (elapsed < totalMs) {
      if (injection.cancelled) return;
      await new Promise(r => setTimeout(r, CANCEL_POLL_MS));
      elapsed += CANCEL_POLL_MS;
    }

    log("[injectAudioWebRTC] Fallback playback complete — re-enabling mic");
    try {
      await room.localParticipant.unpublishTrack(publication.track!);
    } catch (_) {}
    cleanupResources();
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (_) {}
    injection.cleanup = undefined;
  }
}
