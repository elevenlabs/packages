import { loadAudioConcatProcessor } from "./audioConcatProcessor.generated.js";
import type { FormatConfig } from "../../utils/BaseConnection.js";
import type { AudioWorkletConfig } from "../../BaseConversation.js";
import { addLibsamplerateModule } from "./addLibsamplerateModule.js";
import type {
  OutputController,
  OutputDeviceConfig,
  OutputConfig,
  PlaybackEventTarget,
  PlaybackListener,
} from "../../OutputController.js";
import {
  createAnalyserVolumeProvider,
  type VolumeProvider,
} from "./volumeProvider.js";
import { isIosDevice } from "./compatibility.js";

function maybePrimeIosPlayback({
  sampleRate,
  format,
  worklet,
  audioElement,
}: {
  sampleRate: number;
  format: FormatConfig["format"];
  worklet: AudioWorkletNode;
  audioElement: HTMLAudioElement;
}): void {
  if (!isIosDevice()) {
    return;
  }

  // ~100ms of silence is enough to flush the worklet → MediaStream → audio
  // element pipeline so iOS treats the element as "playing media" and won't
  // stall the first real audio chunk.
  const PRIME_DURATION_MS = 100;
  const primeFrameCount = Math.floor((sampleRate * PRIME_DURATION_MS) / 1000);
  // μ-law silence is 0xFF, not 0x00. The worklet decodes 0x00 to ~-32124
  // (near full-scale negative DC), which would emit a loud pop instead of
  // priming with silence. PCM silence is plain zero, so the zero-filled
  // Int16Array is correct as-is.
  const silentBuffer =
    format === "ulaw"
      ? new Uint8Array(primeFrameCount).fill(0xff)
      : new Int16Array(primeFrameCount);
  worklet.port.postMessage({
    type: "buffer",
    buffer: silentBuffer.buffer,
  });
  void audioElement.play().catch(() => {});
}

export class MediaDeviceOutput
  implements OutputController, PlaybackEventTarget
{
  public static async create({
    sampleRate,
    format,
    outputDeviceId,
    workletPaths,
    libsampleratePath,
    audioContext,
  }: FormatConfig &
    OutputConfig &
    AudioWorkletConfig & {
      audioContext?: AudioContext;
    }): Promise<MediaDeviceOutput> {
    let context: AudioContext | null = audioContext ?? null;
    let audioElement: HTMLAudioElement | null = null;
    try {
      const supportsSampleRateConstraint =
        navigator.mediaDevices.getSupportedConstraints().sampleRate;
      if (!context) {
        context = new AudioContext(
          supportsSampleRateConstraint ? { sampleRate } : {}
        );
      }

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

      maybePrimeIosPlayback({ sampleRate, format, worklet, audioElement });

      // Set initial output device if provided
      if (outputDeviceId && audioElement.setSinkId) {
        await audioElement.setSinkId(outputDeviceId);
      }

      const newOutput = new MediaDeviceOutput(
        context,
        analyser,
        gain,
        worklet,
        audioElement
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

  private constructor(
    private readonly context: AudioContext,
    private readonly analyser: AnalyserNode,
    private readonly gain: GainNode,
    private readonly worklet: AudioWorkletNode,
    private readonly audioElement: HTMLAudioElement
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
    this.audioElement.pause();
    await this.context.close();
  }
}
