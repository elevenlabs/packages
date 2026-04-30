import { loadAudioConcatProcessor } from "./audioConcatProcessor.generated.js";
import type { FormatConfig } from "./connection.js";
import type { AudioWorkletConfig } from "../BaseConversation.js";
import { addLibsamplerateModule } from "./addLibsamplerateModule.js";
import type { AudioStreamListener } from "../AudioStream.js";
import type {
  OutputController,
  OutputDeviceConfig,
} from "../OutputController.js";
import {
  createAnalyserVolumeProvider,
  type VolumeProvider,
} from "./volumeProvider.js";

export type OutputConfig = OutputDeviceConfig;

// Audio data events from connection to output device
export type OutputAudioEvent = {
  audio_base_64: string;
};
export type OutputListener = (event: OutputAudioEvent) => void;

export type OutputEventTarget = {
  addListener(listener: OutputListener): void;
  removeListener(listener: OutputListener): void;
};

// Playback state events from output worklet
export type PlaybackStateEvent = MessageEvent<{
  type: "process";
  finished: boolean;
}>;
export type PlaybackListener = (event: PlaybackStateEvent) => void;

export type PlaybackEventTarget = {
  addListener(listener: PlaybackListener): void;
  removeListener(listener: PlaybackListener): void;
};

export class MediaDeviceOutput
  implements OutputController, PlaybackEventTarget
{
  public static async create({
    sampleRate,
    format,
    outputDeviceId,
    workletPaths,
    libsampleratePath,
  }: FormatConfig &
    OutputConfig &
    AudioWorkletConfig): Promise<MediaDeviceOutput> {
    let context: AudioContext | null = null;
    let audioElement: HTMLAudioElement | null = null;
    try {
      const supportsSampleRateConstraint =
        navigator.mediaDevices.getSupportedConstraints().sampleRate;
      context = new AudioContext(
        supportsSampleRateConstraint ? { sampleRate } : {}
      );

      const analyser = context.createAnalyser();
      const gain = context.createGain();

      // Always create an audio element for device switching capability
      audioElement = new Audio();
      audioElement.src = "";
      audioElement.load();
      audioElement.autoplay = true;
      audioElement.style.display = "none";

      document.body.appendChild(audioElement);

      // Create media stream destination to route audio to the element
      const destination = context.createMediaStreamDestination();
      audioElement.srcObject = destination.stream;

      gain.connect(analyser);
      analyser.connect(destination);

      if (!supportsSampleRateConstraint || context.sampleRate !== sampleRate) {
        if (context.sampleRate !== sampleRate) {
          console.warn(
            `[ConversationalAI] Sample rate ${sampleRate} not available, resampling to ${context.sampleRate}`
          );
        }
        await addLibsamplerateModule(context, libsampleratePath);
      }
      await loadAudioConcatProcessor(
        context.audioWorklet,
        workletPaths?.audioConcatProcessor
      );
      const worklet = new AudioWorkletNode(context, "audioConcatProcessor");
      worklet.port.postMessage({ type: "setFormat", format, sampleRate });
      worklet.connect(gain);

      await context.resume();

      // Set initial output device if provided
      if (outputDeviceId && audioElement.setSinkId) {
        await audioElement.setSinkId(outputDeviceId);
      }

      const newOutput = new MediaDeviceOutput(
        context,
        analyser,
        gain,
        worklet,
        audioElement,
        destination.stream
      );

      return newOutput;
    } catch (error) {
      // Clean up audio element from DOM
      if (audioElement?.parentNode) {
        audioElement.parentNode.removeChild(audioElement);
      }
      audioElement?.pause();
      if (context && context.state !== "closed") {
        await context.close();
      }

      throw error;
    }
  }

  private volume = 1;
  private interrupted = false;
  private interruptTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly volumeProvider: VolumeProvider;
  private readonly outputAudioStreamListeners = new Set<AudioStreamListener>();

  private constructor(
    private readonly context: AudioContext,
    private readonly analyser: AnalyserNode,
    private readonly gain: GainNode,
    private readonly worklet: AudioWorkletNode,
    private readonly audioElement: HTMLAudioElement,
    private readonly audioStream: MediaStream
  ) {
    // Start the MessagePort to enable addEventListener to work
    // (required when using addEventListener instead of onmessage)
    this.worklet.port.start();
    this.volumeProvider = createAnalyserVolumeProvider(
      analyser,
      context.sampleRate
    );
  }

  public getAnalyser(): AnalyserNode {
    return this.analyser;
  }

  public getVolume(): number {
    return this.volumeProvider.getVolume();
  }

  public getByteFrequencyData(buffer: Uint8Array<ArrayBuffer>): void {
    this.volumeProvider.getByteFrequencyData(buffer);
  }

  public getOutputAudioStream(): MediaStream {
    return this.audioStream;
  }

  public addOutputAudioStreamListener(listener: AudioStreamListener): void {
    this.outputAudioStreamListeners.add(listener);
    listener(this.audioStream);
  }

  public removeOutputAudioStreamListener(listener: AudioStreamListener): void {
    this.outputAudioStreamListeners.delete(listener);
  }

  public addListener(listener: PlaybackListener): void {
    this.worklet.port.addEventListener("message", listener);
  }

  public removeListener(listener: PlaybackListener): void {
    this.worklet.port.removeEventListener("message", listener);
  }

  public setVolume(volume: number): void {
    this.volume = volume;
    this.gain.gain.value = volume;
  }

  public playAudio(chunk: ArrayBuffer): void {
    this.gain.gain.cancelScheduledValues(this.context.currentTime);
    this.gain.gain.value = this.volume;
    if (this.interruptTimeout) {
      clearTimeout(this.interruptTimeout);
      this.interruptTimeout = null;
    }
    this.worklet.port.postMessage({ type: "clearInterrupted" });
    this.worklet.port.postMessage({ type: "buffer", buffer: chunk });
  }

  public interrupt(resetDuration = 2000): void {
    this.interrupted = true;

    // Clear any existing timeout
    if (this.interruptTimeout) {
      clearTimeout(this.interruptTimeout);
      this.interruptTimeout = null;
    }

    // Send interrupt message to worklet to flush queued buffers
    this.worklet.port.postMessage({ type: "interrupt" });

    // Fade out audio gain
    this.gain.gain.exponentialRampToValueAtTime(
      0.0001,
      this.context.currentTime + resetDuration / 1000
    );

    // After fade completes, restore volume and accept new audio
    this.interruptTimeout = setTimeout(() => {
      this.interrupted = false;
      this.gain.gain.value = this.volume;
      this.worklet.port.postMessage({ type: "clearInterrupted" });
      this.interruptTimeout = null;
    }, resetDuration);
  }

  public async setDevice(
    config?: Partial<FormatConfig> & OutputDeviceConfig
  ): Promise<void> {
    if (!("setSinkId" in HTMLAudioElement.prototype)) {
      throw new Error("setSinkId is not supported in this browser");
    }

    // Extract outputDeviceId from config
    const outputDeviceId = config?.outputDeviceId;

    // Note: sampleRate and format cannot be changed on an existing output
    // (would require recreating the AudioContext).
    // These options are only used during initial MediaDeviceOutput.create()

    // If deviceId is undefined, use empty string which resets to default device
    await this.audioElement.setSinkId(outputDeviceId || "");
  }

  public async close() {
    // Clear any pending interrupt timeout
    if (this.interruptTimeout) {
      clearTimeout(this.interruptTimeout);
      this.interruptTimeout = null;
    }

    // Remove audio element from DOM
    if (this.audioElement.parentNode) {
      this.audioElement.parentNode.removeChild(this.audioElement);
    }
    this.outputAudioStreamListeners.forEach(listener => listener(null));
    this.outputAudioStreamListeners.clear();
    this.audioElement.pause();
    await this.context.close();
  }
}
