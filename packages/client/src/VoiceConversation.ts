import {
  arrayBufferToBase64,
  base64ToArrayBuffer,
  int16ArrayToBase64,
  resamplePCM,
} from "./utils/audio";
import { Input, type InputConfig } from "./utils/input";
import { Output } from "./utils/output";
import { createConnection } from "./utils/ConnectionFactory";
import type { BaseConnection, FormatConfig } from "./utils/BaseConnection";
import { WebRTCConnection } from "./utils/WebRTCConnection";
import { Track } from "livekit-client";
import type { AgentAudioEvent, InterruptionEvent } from "./utils/events";
import { applyDelay } from "./utils/applyDelay";
import {
  BaseConversation,
  type Options,
  type PartialOptions,
} from "./BaseConversation";
import { WebSocketConnection } from "./utils/WebSocketConnection";

// Default sample rate assumed for injected audio when the caller doesn't specify one.
const DEFAULT_INJECT_SAMPLE_RATE = 48000;

// WebRTC uses 48 kHz natively; LiveKit tracks expect this rate.
const WEBRTC_SAMPLE_RATE = 48000;

// Int16 PCM range is [-32768, 32767]. Used to convert between Int16 and Float32.
const INT16_MAX = 32768;

// Interval at which the WebRTC injection loop checks for cancellation.
const CANCEL_POLL_MS = 100;

export class VoiceConversation extends BaseConversation {
  private static async requestWakeLock(): Promise<WakeLockSentinel | null> {
    if ("wakeLock" in navigator) {
      // unavailable without HTTPS, including localhost in dev
      try {
        return await navigator.wakeLock.request("screen");
      } catch (_e) {
        // Wake Lock is not required for the conversation to work
      }
    }
    return null;
  }

  public static async startSession(
    options: PartialOptions
  ): Promise<VoiceConversation> {
    const fullOptions = BaseConversation.getFullOptions(options);

    if (fullOptions.onStatusChange) {
      fullOptions.onStatusChange({ status: "connecting" });
    }
    if (fullOptions.onCanSendFeedbackChange) {
      fullOptions.onCanSendFeedbackChange({ canSendFeedback: false });
    }

    let input: Input | null = null;
    let connection: BaseConnection | null = null;
    let output: Output | null = null;
    let preliminaryInputStream: MediaStream | null = null;

    const useWakeLock = options.useWakeLock ?? true;
    let wakeLock: WakeLockSentinel | null = null;
    if (useWakeLock) {
      wakeLock = await VoiceConversation.requestWakeLock();
    }

    try {
      // some browsers won't allow calling getSupportedConstraints or enumerateDevices
      // before getting approval for microphone access
      preliminaryInputStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      await applyDelay(fullOptions.connectionDelay);
      connection = await createConnection(options);
      [input, output] = await Promise.all([
        Input.create({
          ...connection.inputFormat,
          preferHeadphonesForIosDevices: options.preferHeadphonesForIosDevices,
          inputDeviceId: options.inputDeviceId,
          workletPaths: options.workletPaths,
          libsampleratePath: options.libsampleratePath,
        }),
        Output.create({
          ...connection.outputFormat,
          outputDeviceId: options.outputDeviceId,
          workletPaths: options.workletPaths,
        }),
      ]);

      preliminaryInputStream?.getTracks().forEach(track => {
        track.stop();
      });
      preliminaryInputStream = null;

      return new VoiceConversation(
        fullOptions,
        connection,
        input,
        output,
        wakeLock
      );
    } catch (error) {
      if (fullOptions.onStatusChange) {
        fullOptions.onStatusChange({ status: "disconnected" });
      }
      preliminaryInputStream?.getTracks().forEach(track => {
        track.stop();
      });
      connection?.close();
      await input?.close();
      await output?.close();
      try {
        await wakeLock?.release();
        wakeLock = null;
      } catch (_e) {}
      throw error;
    }
  }

  private inputFrequencyData?: Uint8Array<ArrayBuffer>;
  private outputFrequencyData?: Uint8Array<ArrayBuffer>;
  private visibilityChangeHandler: (() => void) | null = null;

  protected constructor(
    options: Options,
    connection: BaseConnection,
    public input: Input,
    public output: Output,
    public wakeLock: WakeLockSentinel | null
  ) {
    super(options, connection);
    this.input.worklet.port.onmessage = this.onInputWorkletMessage;
    this.output.worklet.port.onmessage = this.onOutputWorkletMessage;

    if (wakeLock) {
      // Wake locks are automatically released when a page is hidden like when switching tabs
      // so attempt to re-acquire lock when page becomes visible again
      this.visibilityChangeHandler = () => {
        if (document.visibilityState === "visible" && this.wakeLock?.released) {
          VoiceConversation.requestWakeLock().then(lock => {
            this.wakeLock = lock;
          });
        }
      };
      document.addEventListener(
        "visibilitychange",
        this.visibilityChangeHandler
      );
    }
  }

  private activeInjection: { cancelled: boolean; cleanup?: () => void } | null =
    null;

  private debugLog(...args: unknown[]) {
    if (this.options.onDebug) {
      this.options.onDebug({ type: "debug_log", args });
    }
  }

  protected override sendAudioToConversation(
    base64Audio: string,
    sampleRate?: number
  ): Promise<{ cancel: () => void }> {
    return this.injectAudio(base64Audio, sampleRate);
  }

  private async injectAudio(
    base64Audio: string,
    sourceSampleRate?: number
  ): Promise<{ cancel: () => void }> {
    if (this.status !== "connected") {
      throw new Error("Not connected to a conversation");
    }

    if (this.activeInjection) {
      this.activeInjection.cancelled = true;
      this.activeInjection.cleanup?.();
    }

    const injection = {
      cancelled: false,
      cleanup: undefined as (() => void) | undefined,
    };
    this.activeInjection = injection;

    const cancel = () => {
      injection.cancelled = true;
      injection.cleanup?.();
    };

    if (this.connection instanceof WebRTCConnection) {
      await this.injectAudioWebRTC(base64Audio, injection);
    } else if (this.connection instanceof WebSocketConnection) {
      await this.injectAudioWebSocket(
        base64Audio,
        sourceSampleRate ?? DEFAULT_INJECT_SAMPLE_RATE,
        injection
      );
    } else {
      throw new Error("Unknown connection type");
    }

    if (this.activeInjection === injection) {
      this.activeInjection = null;
    }

    return { cancel };
  }

  private async injectAudioWebSocket(
    base64Audio: string,
    sourceSampleRate: number,
    injection: { cancelled: boolean }
  ) {
    if (!(this.connection instanceof WebSocketConnection)) return;

    const bytes = base64ToArrayBuffer(base64Audio);
    const pcmData = new Int16Array(bytes);
    const targetSampleRate = this.connection.inputFormat.sampleRate;

    let finalPcm: Int16Array = pcmData;
    if (sourceSampleRate !== targetSampleRate) {
      finalPcm = resamplePCM(pcmData, sourceSampleRate, targetSampleRate);
    }

    // Match the rawAudioProcessor worklet's buffer size (sampleRate / 10 = 100ms)
    // so injected audio is indistinguishable from mic audio on the server side.
    const samplesPerChunk = Math.floor(targetSampleRate / 10);
    const msPerChunk = 100;
    const startTime = performance.now();

    for (
      let i = 0, chunkIndex = 0;
      i < finalPcm.length;
      i += samplesPerChunk, chunkIndex++
    ) {
      if (injection.cancelled || this.status !== "connected") return;

      const chunk = finalPcm.slice(
        i,
        Math.min(i + samplesPerChunk, finalPcm.length)
      );
      const chunkBase64 = int16ArrayToBase64(chunk);

      this.connection.sendMessage({ user_audio_chunk: chunkBase64 });

      const nextChunkTime = startTime + (chunkIndex + 1) * msPerChunk;
      const sleepMs = nextChunkTime - performance.now();
      if (sleepMs > 1) {
        await new Promise(r => setTimeout(r, sleepMs));
      }
    }
  }

  /**
   * Injects pre-recorded audio into a WebRTC (LiveKit) connection by swapping
   * the mic track on the publisher's RTCRtpSender. Falls back to
   * unpublishing/republishing if the publisher transport or sender isn't available.
   */
  private async injectAudioWebRTC(
    base64Audio: string,
    injection: { cancelled: boolean; cleanup?: () => void }
  ) {
    if (!(this.connection instanceof WebRTCConnection)) return;

    const room = this.connection.getRoom();
    if (!room || room.state !== "connected") {
      throw new Error("LiveKit room not connected");
    }

    // Decode base64 PCM16 → Int16 → Float32 (Web Audio API requires [-1.0, 1.0])
    const bytes = base64ToArrayBuffer(base64Audio);
    const int16Data = new Int16Array(bytes);
    const float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / INT16_MAX;
    }

    const sampleRate = WEBRTC_SAMPLE_RATE;
    const durationSeconds = float32Data.length / sampleRate;
    this.debugLog(
      `[injectAudioWebRTC] Preparing ${durationSeconds.toFixed(2)}s of audio (${int16Data.length} samples @ ${sampleRate}Hz)`
    );

    // Build audio graph: BufferSource → GainNode → MediaStreamDestination
    // The destination exposes a MediaStream whose audio track we feed into WebRTC.
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

    // ── Primary path: seamless track replacement ──
    // Try to swap the mic's MediaStreamTrack directly on the RTCRtpSender.
    // This avoids SDP renegotiation so the server sees an uninterrupted stream.
    const micPub = room.localParticipant?.getTrackPublication(
      Track.Source.Microphone
    );
    if (micPub?.track) {
      const originalMicTrack = micPub.track.mediaStreamTrack;

      // Access the publisher's senders through LiveKit's public API:
      // Room.engine → RTCEngine.pcManager → PCTransportManager.publisher → PCTransport.getSenders()
      const publisher = room.engine.pcManager?.publisher;
      const sender = publisher
        ?.getSenders()
        .find((s: RTCRtpSender) => s.track === originalMicTrack);

      if (sender) {
        this.debugLog(
          "[injectAudioWebRTC] Primary path: replacing mic track on RTCRtpSender"
        );
        source.start(0);
        await sender.replaceTrack(newAudioTrack);

        // Register cleanup so external cancellation restores the mic
        injection.cleanup = () => {
          this.debugLog(
            "[injectAudioWebRTC] Cancelled — restoring original mic track"
          );
          sender.replaceTrack(originalMicTrack).catch(() => {});
          cleanupResources();
        };

        // Wait for playback to finish, polling for cancellation
        const totalMs = durationSeconds * 1000;
        let elapsed = 0;
        while (elapsed < totalMs) {
          if (injection.cancelled) return;
          await new Promise(r => setTimeout(r, CANCEL_POLL_MS));
          elapsed += CANCEL_POLL_MS;
        }

        this.debugLog(
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

    // ── Fallback path: unpublish mic and publish injected track ──
    // This triggers SDP renegotiation and may cause a brief audio gap.
    this.debugLog(
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
      this.debugLog(
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

    this.debugLog(
      "[injectAudioWebRTC] Fallback playback complete — re-enabling mic"
    );
    try {
      await room.localParticipant.unpublishTrack(publication.track!);
    } catch (_) {}
    cleanupResources();
    try {
      await room.localParticipant.setMicrophoneEnabled(true);
    } catch (_) {}
    injection.cleanup = undefined;
  }

  protected override async handleEndSession() {
    await super.handleEndSession();

    if (this.activeInjection) {
      this.activeInjection.cancelled = true;
      this.activeInjection.cleanup?.();
      this.activeInjection = null;
    }

    if (this.visibilityChangeHandler) {
      document.removeEventListener(
        "visibilitychange",
        this.visibilityChangeHandler
      );
    }

    try {
      await this.wakeLock?.release();
      this.wakeLock = null;
    } catch (_e) {}

    await this.input.close();
    await this.output.close();
  }

  protected override handleInterruption(event: InterruptionEvent) {
    super.handleInterruption(event);
    this.fadeOutAudio();
  }

  protected override handleAudio(event: AgentAudioEvent) {
    super.handleAudio(event);

    if (event.audio_event.alignment && this.options.onAudioAlignment) {
      this.options.onAudioAlignment(event.audio_event.alignment);
    }

    if (this.lastInterruptTimestamp <= event.audio_event.event_id) {
      if (event.audio_event.audio_base_64) {
        this.options.onAudio?.(event.audio_event.audio_base_64);

        // Only play audio through the output worklet for WebSocket connections
        // WebRTC connections handle audio playback directly through LiveKit tracks
        if (!(this.connection instanceof WebRTCConnection)) {
          this.addAudioBase64Chunk(event.audio_event.audio_base_64);
        }
      }

      this.currentEventId = event.audio_event.event_id;
      this.updateCanSendFeedback();
      this.updateMode("speaking");
    }
  }

  private onInputWorkletMessage = (event: MessageEvent): void => {
    // Suppress mic audio during injection so silent mic chunks don't
    // interleave with injected chunks, which causes gaps in the recording.
    if (this.activeInjection) return;

    const rawAudioPcmData = event.data[0];

    // TODO: When supported, maxVolume can be used to avoid sending silent audio
    // const maxVolume = event.data[1];

    if (this.status === "connected") {
      this.connection.sendMessage({
        user_audio_chunk: arrayBufferToBase64(rawAudioPcmData.buffer),
      });
    }
  };

  private onOutputWorkletMessage = ({ data }: MessageEvent): void => {
    if (data.type === "process") {
      this.updateMode(data.finished ? "listening" : "speaking");
    }
  };

  private addAudioBase64Chunk = (chunk: string) => {
    this.output.gain.gain.cancelScheduledValues(
      this.output.context.currentTime
    );
    this.output.gain.gain.value = this.volume;
    this.output.worklet.port.postMessage({ type: "clearInterrupted" });
    this.output.worklet.port.postMessage({
      type: "buffer",
      buffer: base64ToArrayBuffer(chunk),
    });
  };

  private fadeOutAudio = () => {
    // mute agent
    this.updateMode("listening");
    this.output.worklet.port.postMessage({ type: "interrupt" });
    this.output.gain.gain.exponentialRampToValueAtTime(
      0.0001,
      this.output.context.currentTime + 2
    );

    // reset volume back
    setTimeout(() => {
      this.output.gain.gain.value = this.volume;
      this.output.worklet.port.postMessage({ type: "clearInterrupted" });
    }, 2000); // Adjust the duration as needed
  };

  private calculateVolume = (frequencyData: Uint8Array) => {
    if (frequencyData.length === 0) {
      return 0;
    }

    // TODO: Currently this averages all frequencies, but we should probably
    // bias towards the frequencies that are more typical for human voice
    let volume = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      volume += frequencyData[i] / 255;
    }
    volume /= frequencyData.length;

    return volume < 0 ? 0 : volume > 1 ? 1 : volume;
  };

  public setMicMuted(isMuted: boolean) {
    // Use LiveKit track muting for WebRTC connections
    if (this.connection instanceof WebRTCConnection) {
      this.connection.setMicMuted(isMuted);
    } else {
      // Use input muting for WebSocket connections
      this.input.setMuted(isMuted);
    }
  }

  public getInputByteFrequencyData(): Uint8Array<ArrayBuffer> {
    this.inputFrequencyData ??= new Uint8Array(
      this.input.analyser.frequencyBinCount
    ) as Uint8Array<ArrayBuffer>;
    this.input.analyser.getByteFrequencyData(this.inputFrequencyData);
    return this.inputFrequencyData;
  }

  public getOutputByteFrequencyData(): Uint8Array<ArrayBuffer> {
    // Use WebRTC analyser if available
    if (this.connection instanceof WebRTCConnection) {
      const webrtcData = this.connection.getOutputByteFrequencyData();
      if (webrtcData) {
        return webrtcData as Uint8Array<ArrayBuffer>;
      }
      // Fallback to empty array if WebRTC analyser not ready
      return new Uint8Array(1024) as Uint8Array<ArrayBuffer>;
    }

    this.outputFrequencyData ??= new Uint8Array(
      this.output.analyser.frequencyBinCount
    ) as Uint8Array<ArrayBuffer>;
    this.output.analyser.getByteFrequencyData(this.outputFrequencyData);
    return this.outputFrequencyData;
  }

  public getInputVolume() {
    return this.calculateVolume(this.getInputByteFrequencyData());
  }

  public getOutputVolume() {
    return this.calculateVolume(this.getOutputByteFrequencyData());
  }

  public async changeInputDevice({
    sampleRate,
    format,
    preferHeadphonesForIosDevices,
    inputDeviceId,
  }: FormatConfig & InputConfig): Promise<Input> {
    try {
      // For WebSocket connections, try to change device on existing input first
      if (this.connection instanceof WebSocketConnection) {
        try {
          await this.input.setInputDevice(inputDeviceId);
          return this.input;
        } catch (error) {
          console.warn(
            "Failed to change device on existing input, recreating:",
            error
          );
          // Fall back to recreating the input
        }
      }

      // Handle WebRTC connections differently
      if (this.connection instanceof WebRTCConnection) {
        await this.connection.setAudioInputDevice(inputDeviceId || "");
      }

      // Fallback: recreate the input
      await this.input.close();

      const newInput = await Input.create({
        sampleRate: sampleRate ?? this.connection.inputFormat.sampleRate,
        format: format ?? this.connection.inputFormat.format,
        preferHeadphonesForIosDevices,
        inputDeviceId,
        workletPaths: this.options.workletPaths,
        libsampleratePath: this.options.libsampleratePath,
        onError: this.options.onError,
      });

      this.input = newInput;
      this.input.worklet.port.onmessage = this.onInputWorkletMessage;

      return this.input;
    } catch (error) {
      console.error("Error changing input device", error);
      throw error;
    }
  }

  public async changeOutputDevice({
    sampleRate,
    format,
    outputDeviceId,
  }: FormatConfig): Promise<Output> {
    try {
      // For WebSocket connections, try to change device on existing output first
      if (this.connection instanceof WebSocketConnection) {
        try {
          await this.output.setOutputDevice(outputDeviceId);
          return this.output;
        } catch (error) {
          console.warn(
            "Failed to change device on existing output, recreating:",
            error
          );
          // Fall back to recreating the output
        }
      }

      // Handle WebRTC connections differently
      if (this.connection instanceof WebRTCConnection) {
        await this.connection.setAudioOutputDevice(outputDeviceId || "");
      }

      // Fallback: recreate the output
      await this.output.close();

      const newOutput = await Output.create({
        sampleRate: sampleRate ?? this.connection.outputFormat.sampleRate,
        format: format ?? this.connection.outputFormat.format,
        outputDeviceId,
        workletPaths: this.options.workletPaths,
      });

      this.output = newOutput;

      return this.output;
    } catch (error) {
      console.error("Error changing output device", error);
      throw error;
    }
  }

  public setVolume = ({ volume }: { volume: number }) => {
    // clamp & coerce
    const clampedVolume = Number.isFinite(volume)
      ? Math.min(1, Math.max(0, volume))
      : 1;
    this.volume = clampedVolume;

    if (this.connection instanceof WebRTCConnection) {
      // For WebRTC connections, control volume via HTML audio elements
      this.connection.setAudioVolume(clampedVolume);
    } else {
      // For WebSocket connections, control volume via gain node
      this.output.gain.gain.value = clampedVolume;
    }
  };
}
