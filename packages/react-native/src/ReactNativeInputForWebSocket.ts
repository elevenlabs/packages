import {
  AudioContext,
  AudioRecorder,
  AudioManager,
} from "react-native-audio-api";
import type { InputController, InputDeviceConfig } from "@elevenlabs/client";
import type {
  InputEventTarget,
  InputListener,
  FormatConfig,
} from "@elevenlabs/client/internal";
import { encodeAudio, calculateMaxVolume } from "./audio";

/**
 * React Native input controller for WebSocket voice conversations.
 *
 * Uses `react-native-audio-api`'s `AudioRecorder` connected to an
 * `AudioContext` via a `RecorderAdapterNode`. The recorder must be wired
 * into the audio graph for iOS to deliver audio data.
 */
export class ReactNativeInputForWebSocket
  implements InputController, InputEventTarget
{
  private muted = false;
  private listeners = new Set<InputListener>();
  private recorder: AudioRecorder | null;
  private ctx: AudioContext | null;

  static async create(
    config: FormatConfig
  ): Promise<ReactNativeInputForWebSocket> {
    await AudioManager.requestRecordingPermissions();

    AudioManager.setAudioSessionOptions({
      iosCategory: "playAndRecord",
      iosMode: "voiceChat",
      iosOptions: ["defaultToSpeaker", "allowBluetoothHFP"],
    });

    await AudioManager.setAudioSessionActivity(true);

    let ctx: AudioContext | null = null;
    let recorder: AudioRecorder | null = null;

    try {
      ctx = new AudioContext({ sampleRate: config.sampleRate });
      recorder = new AudioRecorder();

      const input = new ReactNativeInputForWebSocket(ctx, recorder);
      recorder.onAudioReady(
        {
          sampleRate: config.sampleRate,
          bufferLength: Math.floor(config.sampleRate * 0.1),
          channelCount: 1,
        },
        event => {
          if (input.muted) return;

          const floatData = event.buffer.getChannelData(0);
          if (floatData.length === 0) return;

          const encoded = encodeAudio(floatData, config.format);
          const maxVolume = calculateMaxVolume(floatData);

          const messageEvent = {
            data: [encoded, maxVolume],
          } as MessageEvent<[Uint8Array, number]>;
          input.listeners.forEach(listener => listener(messageEvent));
        }
      );

      const adapterNode = ctx.createRecorderAdapter();
      adapterNode.connect(ctx.destination);
      recorder.connect(adapterNode);
      recorder.start();
      return input;
    } catch (error) {
      await Promise.allSettled([
        AudioManager.setAudioSessionActivity(false),
        cleanup(recorder, ctx),
      ]);
      throw error;
    }
  }

  private constructor(ctx: AudioContext, recorder: AudioRecorder) {
    this.ctx = ctx;
    this.recorder = recorder;
  }

  public addListener(listener: InputListener): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: InputListener): void {
    this.listeners.delete(listener);
  }

  public async close(): Promise<void> {
    const [recorder, ctx] = [this.recorder, this.ctx];
    this.listeners.clear();
    this.recorder = null;
    this.ctx = null;
    await cleanup(recorder, ctx);
  }

  public async setDevice(
    _config?: Partial<FormatConfig> & InputDeviceConfig
  ): Promise<void> {
    throw new Error(
      "Input device switching is not supported in React Native WebSocket mode"
    );
  }

  public async setMuted(isMuted: boolean): Promise<void> {
    this.muted = isMuted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public getAnalyser(): undefined {
    return undefined;
  }
}

async function cleanup(
  recorder: AudioRecorder | null,
  ctx: AudioContext | null
): Promise<void> {
  recorder?.clearOnAudioReady();
  recorder?.stop();
  recorder?.disconnect();
  await ctx?.close();
}
