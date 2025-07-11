import { arrayBufferToBase64, base64ToArrayBuffer } from "./utils/audio";
import { Input } from "./utils/input";
import { Output } from "./utils/output";
import { createConnection } from "./utils/ConnectionFactory";
import type { BaseConnection } from "./utils/BaseConnection";
import type { AgentAudioEvent, InterruptionEvent } from "./utils/events";
import { applyDelay } from "./utils/applyDelay";
import {
  BaseConversation,
  type Options,
  type PartialOptions,
} from "./BaseConversation";

export class VoiceConversation extends BaseConversation {
  public static async startSession(
    options: PartialOptions
  ): Promise<VoiceConversation> {
    const fullOptions = BaseConversation.getFullOptions(options);

    fullOptions.onStatusChange({ status: "connecting" });
    fullOptions.onCanSendFeedbackChange({ canSendFeedback: false });

    let input: Input | null = null;
    let connection: BaseConnection | null = null;
    let output: Output | null = null;
    let preliminaryInputStream: MediaStream | null = null;

    let wakeLock: WakeLockSentinel | null = null;
    if (options.useWakeLock ?? true) {
      try {
        wakeLock = await navigator.wakeLock.request("screen");
      } catch (e) {
        // Wake Lock is not required for the conversation to work
      }
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
        }),
        Output.create(connection.outputFormat),
      ]);

      preliminaryInputStream?.getTracks().forEach(track => track.stop());
      preliminaryInputStream = null;

      return new VoiceConversation(
        fullOptions,
        connection,
        input,
        output,
        wakeLock
      );
    } catch (error) {
      fullOptions.onStatusChange({ status: "disconnected" });
      preliminaryInputStream?.getTracks().forEach(track => track.stop());
      connection?.close();
      await input?.close();
      await output?.close();
      try {
        await wakeLock?.release();
        wakeLock = null;
      } catch (e) {}
      throw error;
    }
  }

  private inputFrequencyData?: Uint8Array;
  private outputFrequencyData?: Uint8Array;

  protected constructor(
    options: Options,
    connection: BaseConnection,
    public readonly input: Input,
    public readonly output: Output,
    public wakeLock: WakeLockSentinel | null
  ) {
    super(options, connection);
    this.input.worklet.port.onmessage = this.onInputWorkletMessage;
    this.output.worklet.port.onmessage = this.onOutputWorkletMessage;
  }

  protected override async handleEndSession() {
    await super.handleEndSession();
    try {
      await this.wakeLock?.release();
      this.wakeLock = null;
    } catch (e) {}

    await this.input.close();
    await this.output.close();
  }

  protected override handleInterruption(event: InterruptionEvent) {
    super.handleInterruption(event);
    this.fadeOutAudio();
  }

  protected override handleAudio(event: AgentAudioEvent) {
    if (this.lastInterruptTimestamp <= event.audio_event.event_id) {
      this.options.onAudio(event.audio_event.audio_base_64);
      this.addAudioBase64Chunk(event.audio_event.audio_base_64);
      this.currentEventId = event.audio_event.event_id;
      this.updateCanSendFeedback();
      this.updateMode("speaking");
    }
  }

  private onInputWorkletMessage = (event: MessageEvent): void => {
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
    this.input.setMuted(isMuted);
  }

  public getInputByteFrequencyData() {
    this.inputFrequencyData ??= new Uint8Array(
      this.input.analyser.frequencyBinCount
    );
    this.input.analyser.getByteFrequencyData(this.inputFrequencyData);
    return this.inputFrequencyData;
  }

  public getOutputByteFrequencyData() {
    this.outputFrequencyData ??= new Uint8Array(
      this.output.analyser.frequencyBinCount
    );
    this.output.analyser.getByteFrequencyData(this.outputFrequencyData);
    return this.outputFrequencyData;
  }

  public getInputVolume() {
    return this.calculateVolume(this.getInputByteFrequencyData());
  }

  public getOutputVolume() {
    return this.calculateVolume(this.getOutputByteFrequencyData());
  }
}
