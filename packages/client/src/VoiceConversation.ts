import type { InputConfig } from "./InputController.js";
import type {
  OutputConfig,
  PlaybackEventTarget,
  PlaybackListener,
} from "./OutputController.js";
import type { BaseConnection, FormatConfig } from "./utils/BaseConnection.js";
import type { AgentAudioEvent, InterruptionEvent } from "./utils/events.js";
import {
  BaseConversation,
  type Options,
  type PartialOptions,
} from "./BaseConversation.js";
import type { InputController } from "./InputController.js";
import type { OutputController } from "./OutputController.js";
import { setupStrategy } from "./platform/VoiceSessionSetup.js";
import type { VoiceSessionSetupResult } from "./platform/VoiceSessionSetup.js";

export class VoiceConversation extends BaseConversation {
  readonly type = "voice";

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

    let conversation: VoiceConversation | null = null;
    let sessionSetup: VoiceSessionSetupResult | null = null;

    try {
      // Platform-specific strategy handles wake lock, mic permission,
      // delay, connection creation, and input/output setup.
      if (!setupStrategy) {
        throw new Error(
          "No voice session setup strategy registered. " +
            'Import the platform-specific entry point (e.g. @elevenlabs/client via the "browser" export).'
        );
      }
      sessionSetup = await setupStrategy(fullOptions);

      conversation = new VoiceConversation(
        fullOptions,
        sessionSetup.connection,
        sessionSetup.input,
        sessionSetup.output,
        sessionSetup.playbackEventTarget,
        sessionSetup.detach
      );
      fullOptions.onConversationCreated?.(conversation);
      conversation.markConnected();
      fullOptions.onConnect?.({
        conversationId: sessionSetup.connection.conversationId,
      });
      return conversation;
    } catch (error) {
      if (conversation) {
        await conversation.endSession().catch(() => {});
      } else {
        // Strategy returned but conversation wasn't created — clean up
        if (sessionSetup) {
          await sessionSetup.detach().catch(() => {});
        }
        fullOptions.onStatusChange?.({ status: "disconnected" });
      }
      throw error;
    }
  }

  private inputFrequencyData?: Uint8Array<ArrayBuffer>;
  private outputFrequencyData?: Uint8Array<ArrayBuffer>;

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
    private cleanUp: () => Promise<void>
  ) {
    super(options, connection);

    playbackEventTarget?.addListener(this.handlePlaybackEvent);
  }

  protected override async handleEndSession() {
    this.playbackEventTarget?.removeListener(this.handlePlaybackEvent);
    this.playbackEventTarget = null;
    await this.cleanUp();
    await this.input.close();
    await this.output.close();
    await super.handleEndSession();
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
