import {
  AudioRecorder,
  AudioManager,
  type AudioContext,
} from "react-native-audio-api";
import type { InputController, InputDeviceConfig } from "@elevenlabs/client";
import type {
  InputEventTarget,
  InputListener,
  FormatConfig,
} from "@elevenlabs/client/internal";

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
  private recorder: AudioRecorder;

  static async create(
    config: FormatConfig,
    audioContext: AudioContext
  ): Promise<ReactNativeInputForWebSocket> {
    await AudioManager.requestRecordingPermissions();

    AudioManager.setAudioSessionOptions({
      iosCategory: "playAndRecord",
      iosMode: "voiceChat",
      iosOptions: ["defaultToSpeaker", "allowBluetoothHFP"],
    });

    await AudioManager.setAudioSessionActivity(true);

    return new ReactNativeInputForWebSocket(config, audioContext);
  }

  private constructor(config: FormatConfig, audioContext: AudioContext) {
    this.recorder = new AudioRecorder();

    this.recorder.onAudioReady(
      {
        sampleRate: config.sampleRate,
        bufferLength: Math.floor(config.sampleRate * 0.1),
        channelCount: 1,
      },
      event => {
        if (this.muted) return;

        const floatData = event.buffer.getChannelData(0);
        if (floatData.length === 0) return;

        const pcmData = new Uint8Array(floatData.length * 2);
        const view = new DataView(pcmData.buffer);
        let maxVolume = 0;

        for (let i = 0; i < floatData.length; i++) {
          const sample = Math.max(-1, Math.min(1, floatData[i]));
          const int16 = sample < 0 ? sample * 32768 : sample * 32767;
          view.setInt16(i * 2, int16, true);

          const normalized = Math.abs(sample);
          if (normalized > maxVolume) maxVolume = normalized;
        }

        const messageEvent = {
          data: [pcmData, maxVolume],
        } as MessageEvent<[Uint8Array, number]>;
        this.listeners.forEach(listener => listener(messageEvent));
      }
    );

    const adapterNode = audioContext.createRecorderAdapter();
    adapterNode.connect(audioContext.destination);
    this.recorder.connect(adapterNode);
    this.recorder.start();
  }

  public addListener(listener: InputListener): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: InputListener): void {
    this.listeners.delete(listener);
  }

  public async close(): Promise<void> {
    this.recorder.clearOnAudioReady();
    this.recorder.stop();
    this.recorder.disconnect();
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
