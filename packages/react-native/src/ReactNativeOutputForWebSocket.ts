import {
  AudioContext,
  type GainNode,
  type AudioBufferQueueSourceNode,
} from "react-native-audio-api";
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
  private ctx: AudioContext | null;
  private gainNode: GainNode | null;
  private queueSource: AudioBufferQueueSourceNode | null;
  private started = false;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  static async create(
    config: FormatConfig
  ): Promise<ReactNativeOutputForWebSocket> {
    let ctx: AudioContext | null = null;
    let gainNode: GainNode | null = null;
    let queueSource: AudioBufferQueueSourceNode | null = null;

    try {
      ctx = new AudioContext({ sampleRate: config.sampleRate });
      gainNode = ctx.createGain();
      gainNode.connect(ctx.destination);
      queueSource = ctx.createBufferQueueSource();
      queueSource.connect(gainNode);
      return new ReactNativeOutputForWebSocket(
        config,
        ctx,
        gainNode,
        queueSource
      );
    } catch (error) {
      await cleanup(ctx, gainNode, queueSource);
      throw error;
    }
  }

  private constructor(
    private config: FormatConfig,
    ctx: AudioContext,
    gainNode: GainNode,
    queueSource: AudioBufferQueueSourceNode
  ) {
    this.ctx = ctx;
    this.gainNode = gainNode;
    this.queueSource = queueSource;
  }

  public playAudio(chunk: ArrayBuffer): void {
    if (this.interrupted || !this.ctx || !this.queueSource) return;

    const floatData = decodeAudio(chunk, this.config.format);

    const audioBuffer = this.ctx.createBuffer(
      1,
      floatData.length,
      this.config.sampleRate
    );
    audioBuffer?.copyToChannel(floatData, 0);
    this.queueSource?.enqueueBuffer(audioBuffer);

    if (!this.started) {
      this.queueSource?.start();
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
    if (!this.ctx || !this.queueSource) return;

    this.interrupted = true;
    this.queueSource?.clearBuffers();

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
    if (this.gainNode) {
      this.gainNode.gain.value = volume;
    }
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
    const [ctx, gainNode, queueSource] = [
      this.ctx,
      this.gainNode,
      this.queueSource,
    ];

    if (this.interruptTimeout) {
      clearTimeout(this.interruptTimeout);
      this.interruptTimeout = null;
    }
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    this.ctx = null;
    this.gainNode = null;
    this.queueSource = null;
    this.listeners.clear();
    this.interrupted = false;
    this.started = false;

    await cleanup(ctx, gainNode, queueSource);
  }
}

async function cleanup(
  ctx: AudioContext | null,
  gainNode: GainNode | null,
  queueSource: AudioBufferQueueSourceNode | null
): Promise<void> {
  queueSource?.clearBuffers();
  queueSource?.disconnect();
  gainNode?.disconnect();
  await ctx?.close();
}
