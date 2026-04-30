import type { InputConfig } from "./utils/input.js";
import type {
  OutputConfig,
  PlaybackEventTarget,
  PlaybackListener,
} from "./utils/output.js";
import type { BaseConnection, FormatConfig } from "./utils/BaseConnection.js";
import type { AgentAudioEvent, InterruptionEvent } from "./utils/events.js";
import { applyDelay } from "./utils/applyDelay.js";
import {
  BaseConversation,
  type Options,
  type PartialOptions,
} from "./BaseConversation.js";
import type { InputController } from "./InputController.js";
import type { OutputController } from "./OutputController.js";
import { setupStrategy } from "./platform/VoiceSessionSetup.js";

export class VoiceConversation extends BaseConversation {
  readonly type = "voice";

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
    let conversation: VoiceConversation | null = null;

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

      conversation = new VoiceConversation(
        fullOptions,
        sessionSetup.connection,
        sessionSetup.input,
        sessionSetup.output,
        sessionSetup.playbackEventTarget,
        sessionSetup.detach,
        wakeLock
      );
      fullOptions.onConversationCreated?.(conversation);
      conversation.markConnected();
      fullOptions.onConnect?.({
        conversationId: sessionSetup.connection.conversationId,
      });
      return conversation;
    } catch (error) {
      preliminaryInputStream?.getTracks().forEach(track => {
        track.stop();
      });
      if (conversation) {
        await conversation.endSession().catch(() => {});
      } else {
        fullOptions.onStatusChange?.({ status: "disconnected" });
      }
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
  private pausedMicMuted: boolean | null = null;
  private pausedVolume: number | null = null;

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

  protected override async handlePause(): Promise<void> {
    this.pausedMicMuted = this.input.isMuted();
    this.pausedVolume = this.volume;
    this.output.setPlaybackEnabled(false);
    try {
      this.output.interrupt(0);
      this.setVolume({ volume: 0 });
      await this.input.setMuted(true);
      this.updateMode("listening");
    } catch (error) {
      this.output.setPlaybackEnabled(true);
      throw error;
    }
  }

  protected override async handleResume(): Promise<void> {
    const volume = this.pausedVolume ?? this.volume;
    const isMuted = this.pausedMicMuted ?? false;
    try {
      this.setVolume({ volume });
      await this.input.setMuted(isMuted);
      this.pausedVolume = null;
      this.pausedMicMuted = null;
    } finally {
      this.output.setPlaybackEnabled(true);
    }
  }

  protected override shouldHandleAudio(_event: AgentAudioEvent): boolean {
    return !this.paused;
  }

  private static readonly FREQUENCY_BIN_COUNT = 1024;

  public setMicMuted(isMuted: boolean) {
    this.input.setMuted(isMuted).catch(error => {
      this.options.onError?.("Failed to set input muted state", error);
    });
  }

  public getInputByteFrequencyData(): Uint8Array<ArrayBuffer> {
    this.inputFrequencyData ??= new Uint8Array(
      VoiceConversation.FREQUENCY_BIN_COUNT
    ) as Uint8Array<ArrayBuffer>;
    this.input.getByteFrequencyData(this.inputFrequencyData);
    return this.inputFrequencyData;
  }

  public getOutputByteFrequencyData(): Uint8Array<ArrayBuffer> {
    this.outputFrequencyData ??= new Uint8Array(
      VoiceConversation.FREQUENCY_BIN_COUNT
    ) as Uint8Array<ArrayBuffer>;
    this.output.getByteFrequencyData(this.outputFrequencyData);
    return this.outputFrequencyData;
  }

  public getInputVolume(): number {
    return this.input.getVolume();
  }

  public getOutputVolume(): number {
    return this.output.getVolume();
  }

  public async changeInputDevice({
    sampleRate,
    format,
    preferHeadphonesForIosDevices,
    inputDeviceId,
  }: Partial<FormatConfig> & InputConfig): Promise<void> {
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
  }: Partial<FormatConfig> & OutputConfig): Promise<void> {
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
