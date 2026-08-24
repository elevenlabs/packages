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
import { ensureSetupStrategy } from "./platform/VoiceSessionSetup.js";
import type { VoiceSessionSetupResult } from "./platform/VoiceSessionSetup.js";

/**
 * How often a `user_activity` message is sent while the conversation is on
 * hold. The agent treats user activity as "the user is busy elsewhere", which
 * is what keeps it from starting a turn nobody is listening to, and it is
 * also what stops the session idling out while it is held.
 */
const HOLD_ACTIVITY_INTERVAL_MS = 1000;

/**
 * Fade applied to the output when a hold starts and when it is released.
 * Long enough not to click, short enough that a hold is immediate to the ear.
 * The two second default `interrupt()` uses for a server-side interruption is
 * far too slow for a caller that asked for the agent to stop right now.
 */
const HOLD_FADE_MS = 50;

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
      sessionSetup = await ensureSetupStrategy()(fullOptions);

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
  private onHold = false;
  /**
   * The microphone state to return to when the hold is released: whatever it
   * was when the hold started, or whatever `setMicMuted` was asked for while
   * the hold was in place.
   */
  private micMutedOutsideHold = false;
  private holdActivityTimer: ReturnType<typeof setInterval> | null = null;

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
    this.clearHoldActivityTimer();
    this.playbackEventTarget?.removeListener(this.handlePlaybackEvent);
    this.playbackEventTarget = null;
    await this.cleanUp();
    await super.handleEndSession();
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
      // Audio that arrives during a hold is silenced rather than played, so
      // reporting "speaking" would describe something the user cannot hear.
      if (!this.onHold) {
        this.updateMode("speaking");
      }
    }
  }

  private static readonly FREQUENCY_BIN_COUNT = 1024;

  public setMicMuted(isMuted: boolean) {
    if (this.onHold) {
      // A hold owns the microphone for as long as it lasts; remember what was
      // asked for and apply it when the hold is released.
      this.micMutedOutsideHold = isMuted;
      return;
    }
    this.applyMicMuted(isMuted);
  }

  private applyMicMuted(isMuted: boolean) {
    this.input.setMuted(isMuted).catch(error => {
      this.options.onError?.("Failed to set input muted state", error);
    });
  }

  /** Whether the conversation is currently on hold. */
  public isOnHold(): boolean {
    return this.onHold;
  }

  /**
   * Puts the conversation on hold, or takes it off hold again.
   *
   * A hold keeps the connection, the conversation id and the agent's context
   * intact, so the user can come back to the same conversation without paying
   * for a reconnect. For as long as it lasts, though, the agent is neither
   * heard nor spoken to:
   *
   * - whatever the agent is saying stops instead of playing to completion,
   *   and audio that keeps arriving is silenced rather than queued up;
   * - the microphone is muted, so nothing said nearby reaches the agent or
   *   starts a turn;
   * - a periodic `user_activity` message tells the agent the user is busy, so
   *   it does not speak up on its own or let the session idle out.
   *
   * Releasing the hold restores the microphone and the volume the caller had
   * asked for, and drops the audio that arrived meanwhile so the agent does
   * not resume mid-sentence.
   */
  public setOnHold(isOnHold: boolean): void {
    if (isOnHold === this.onHold) return;
    this.onHold = isOnHold;

    if (isOnHold) {
      this.micMutedOutsideHold = this.input.isMuted();
      // Stop the current utterance, then silence the output. Order matters:
      // interrupt() restores the output's own volume once its fade completes,
      // so the zero has to be the value it restores to.
      this.output.interrupt(HOLD_FADE_MS);
      this.output.setVolume(0);
      this.applyMicMuted(true);
      this.updateMode("listening");

      // There is nothing to keep quiet once the session is gone, and an
      // interval started then would outlive the conversation itself.
      if (this.isOpen()) {
        this.holdActivityTimer = setInterval(() => {
          this.sendUserActivity();
        }, HOLD_ACTIVITY_INTERVAL_MS);
      }
    } else {
      this.clearHoldActivityTimer();
      // Audio the agent sent while nobody was listening is still queued in
      // the output; drop it so playback resumes from what the agent says next
      // rather than from the middle of what it said during the hold. Same
      // ordering rule as above, opposite value: interrupt() restores the
      // output's own volume when it flushes, so the volume to come back to
      // has to be set first.
      this.output.setVolume(this.volume);
      this.output.interrupt(HOLD_FADE_MS);
      this.applyMicMuted(this.micMutedOutsideHold);
    }
  }

  private clearHoldActivityTimer() {
    if (this.holdActivityTimer !== null) {
      clearInterval(this.holdActivityTimer);
      this.holdActivityTimer = null;
    }
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

    // A hold silences the output; the requested volume is remembered above
    // and applied when the hold is released, rather than letting a volume
    // change bring the held agent back.
    if (this.onHold) return;

    // Delegate to output controller
    this.output.setVolume(clampedVolume);
  };
}
