import { AudioContext } from "react-native-audio-api";
import type { OutputController, OutputDeviceConfig } from "@elevenlabs/client";
import type {
  PlaybackEventTarget,
  PlaybackListener,
  FormatConfig,
} from "@elevenlabs/client/internal";
import { decodeAudio } from "./audio";

/**
 * React Native output controller for WebSocket voice conversations.
 *
 * Uses `react-native-audio-api`'s `AudioBufferQueueSourceNode` for gapless
 * streaming playback of PCM audio chunks.
 */
export class ReactNativeOutputForWebSocket
  implements OutputController, PlaybackEventTarget
{
  private listeners = new Set<PlaybackListener>();
  private interrupted = false;
  private interruptTimeout: ReturnType<typeof setTimeout> | null = null;
  private ctx: AudioContext;
  private gainNode: any;
  private queueSource: any;
  private started = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  static async create(
    config: FormatConfig
  ): Promise<ReactNativeOutputForWebSocket> {
    return new ReactNativeOutputForWebSocket(config);
  }

  private constructor(private config: FormatConfig) {
    this.ctx = new AudioContext({ sampleRate: config.sampleRate });
    this.gainNode = this.ctx.createGain();
    this.gainNode.connect(this.ctx.destination);
    this.queueSource = this.ctx.createBufferQueueSource();
    this.queueSource.connect(this.gainNode);
  }

  public playAudio(chunk: ArrayBuffer): void {
    if (this.interrupted) return;

    const floatData = decodeAudio(chunk, this.config.format);

    const audioBuffer = this.ctx.createBuffer(
      1,
      floatData.length,
      this.config.sampleRate
    );
    audioBuffer.copyToChannel(floatData, 0);
    this.queueSource.enqueueBuffer(audioBuffer);

    if (!this.started) {
      this.queueSource.start();
      this.started = true;
    }

    this.emitPlaybackEvent(false);
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => {
      this.emitPlaybackEvent(true);
    }, 500);
  }

  public interrupt(resetDuration = 2000): void {
    this.interrupted = true;
    this.queueSource.clearBuffers();

    if (this.interruptTimeout) clearTimeout(this.interruptTimeout);
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    this.emitPlaybackEvent(true);

    this.interruptTimeout = setTimeout(() => {
      this.interrupted = false;
      this.interruptTimeout = null;
    }, resetDuration);
  }

  public setVolume(volume: number): void {
    this.gainNode.gain.value = volume;
  }

  public async setDevice(
    _config?: Partial<FormatConfig> & OutputDeviceConfig
  ): Promise<void> {
    throw new Error(
      "Output device switching is not supported in React Native WebSocket mode"
    );
  }

  public getAnalyser(): undefined {
    return undefined;
  }

  public addListener(listener: PlaybackListener): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: PlaybackListener): void {
    this.listeners.delete(listener);
  }

  private emitPlaybackEvent(finished: boolean): void {
    const event = {
      data: { type: "process" as const, finished },
    } as MessageEvent<{ type: "process"; finished: boolean }>;
    this.listeners.forEach(listener => listener(event));
  }

  public async close(): Promise<void> {
    if (this.interruptTimeout) {
      clearTimeout(this.interruptTimeout);
      this.interruptTimeout = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    this.queueSource.clearBuffers();
    await this.ctx.close();
  }
}
