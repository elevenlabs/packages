import type { InputConfig } from "./utils/input";
import type {
  OutputConfig,
  PlaybackEventTarget,
  PlaybackListener,
} from "./utils/output";
import type { BaseConnection, FormatConfig } from "./utils/BaseConnection";
import { WebRTCConnection } from "./utils/WebRTCConnection";
import type { AgentAudioEvent, InterruptionEvent } from "./utils/events";
import { applyDelay } from "./utils/applyDelay";
import {
  BaseConversation,
  type Options,
  type PartialOptions,
} from "./BaseConversation";
import type { InputController } from "./InputController";
import type { OutputController } from "./OutputController";
import { setupStrategy } from "./platform/VoiceSessionSetup";

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

    let preliminaryInputStream: MediaStream | null = null;

    const useWakeLock = options.useWakeLock ?? true;
    let wakeLock: WakeLockSentinel | null = null;
    if (useWakeLock) {
      wakeLock = await VoiceConversation.requestWakeLock();
    }

    try {
      // some browsers won't allow calling getSupportedConstraints or enumerateDevices
      // before getting approval for microphone access.
      // On some platforms (e.g. React Native) this may fail or be unnecessary —
      // treat it as non-fatal since the setup strategy handles its own audio capture.
      try {
        preliminaryInputStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      } catch (_e) {
        // Non-fatal: platform strategy will handle mic access
      }

      await applyDelay(fullOptions.connectionDelay);

      // Platform-specific strategy creates the connection and sets up input/output
      const sessionSetup = await setupStrategy(fullOptions);

      // Stop the preliminary stream after setting up the session.
      // Its only purpose was triggering the browser's microphone permission
      // prompt; it must remain alive until the strategy finishes because
      // MediaDeviceInput.create (WebSocket path) needs mic access granted.
      preliminaryInputStream?.getTracks().forEach(track => {
        track.stop();
      });
      preliminaryInputStream = null;

      return new VoiceConversation(
        fullOptions,
        sessionSetup.connection,
        sessionSetup.input,
        sessionSetup.output,
        sessionSetup.playbackEventTarget,
        sessionSetup.detach,
        wakeLock
      );
    } catch (error) {
      if (fullOptions.onStatusChange) {
        fullOptions.onStatusChange({ status: "disconnected" });
      }
      preliminaryInputStream?.getTracks().forEach(track => {
        track.stop();
      });
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

  private handlePlaybackEvent: PlaybackListener = event => {
    if (event.data.type === "process") {
      this.updateMode(event.data.finished ? "listening" : "speaking");
    }
  };

  protected constructor(
    options: Options,
    connection: BaseConnection,
    private input: InputController,
    private output: OutputController,
    private playbackEventTarget: PlaybackEventTarget | null,
    private cleanUp: () => void,
    private wakeLock: WakeLockSentinel | null
  ) {
    super(options, connection);

    playbackEventTarget?.addListener(this.handlePlaybackEvent);

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

  protected override async handleEndSession() {
    this.cleanUp();
    this.playbackEventTarget?.removeListener(this.handlePlaybackEvent);
    this.playbackEventTarget = null;
    await super.handleEndSession();

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
    this.updateMode("listening");
    this.output.interrupt();
  }

  protected override handleAudio(event: AgentAudioEvent) {
    super.handleAudio(event);

    if (event.audio_event.alignment && this.options.onAudioAlignment) {
      this.options.onAudioAlignment(event.audio_event.alignment);
    }

    if (this.lastInterruptTimestamp <= event.audio_event.event_id) {
      if (event.audio_event.audio_base_64) {
        this.options.onAudio?.(event.audio_event.audio_base_64);
        // Audio routing is handled by attachConnectionToOutput for WebSocket
        // WebRTC handles audio playback directly through LiveKit tracks
      }

      this.currentEventId = event.audio_event.event_id;
      this.updateCanSendFeedback();
      this.updateMode("speaking");
    }
  }

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
    this.input.setMuted(isMuted).catch(error => {
      this.options.onError?.("Failed to set input muted state", error);
    });
  }

  public getInputByteFrequencyData(): Uint8Array<ArrayBuffer> {
    const analyser = this.input.getAnalyser();
    if (!analyser) {
      throw new Error("Input analyser is not available");
    }
    this.inputFrequencyData ??= new Uint8Array(
      analyser.frequencyBinCount
    ) as Uint8Array<ArrayBuffer>;
    analyser.getByteFrequencyData(this.inputFrequencyData);
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

    const analyser = this.output.getAnalyser();
    if (!analyser) {
      throw new Error("Output analyser is not available");
    }

    this.outputFrequencyData ??= new Uint8Array(
      analyser.frequencyBinCount
    ) as Uint8Array<ArrayBuffer>;
    analyser.getByteFrequencyData(this.outputFrequencyData);
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
  }: FormatConfig & InputConfig): Promise<void> {
    try {
      await this.input.setDevice({
        inputDeviceId,
        sampleRate,
        format,
        preferHeadphonesForIosDevices,
      });
    } catch (error) {
      console.error("Error changing input device", error);
      throw error;
    }
  }

  public async changeOutputDevice({
    sampleRate,
    format,
    outputDeviceId,
  }: FormatConfig & OutputConfig): Promise<void> {
    try {
      await this.output.setDevice({
        outputDeviceId,
        sampleRate,
        format,
      });
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

    // Delegate to output controller
    this.output.setVolume(clampedVolume);
  };
}
