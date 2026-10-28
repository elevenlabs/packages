import { loadAudioConcatProcessor } from "./audioConcatProcessor.generated.js";
import type { FormatConfig } from "../../utils/BaseConnection.js";
import type { AudioWorkletConfig } from "../../BaseConversation.js";
import { addLibsamplerateModule } from "./addLibsamplerateModule.js";
import type {
  OutputChunkMetadata,
  OutputController,
  OutputDeviceConfig,
  OutputConfig,
  PlaybackEventTarget,
  PlaybackListener,
  PlaybackStateEvent,
} from "../../OutputController.js";
import {
  createAnalyserVolumeProvider,
  type VolumeProvider,
} from "./volumeProvider.js";
import { isIosDevice } from "./compatibility.js";

type WorkletMessage =
  | { type: "process"; finished: boolean }
  | { type: "chunk_start"; chunkId: number };

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

export type MediaDeviceOutputConfig = FormatConfig &
  OutputConfig &
  AudioWorkletConfig & {
    audioContext?: AudioContext;
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
    audioContext,
  }: MediaDeviceOutputConfig): Promise<MediaDeviceOutput> {
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
      const worklet = await loadAudioConcatProcessor(
        context,
        workletPaths?.audioConcatProcessor
      );
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

  // Resume only after an actual playback request. A backgrounded browser may
  // reject resume() until user activation; the next visibility change retries.
  private playbackPending = false;
  private recoveryInFlight: Promise<void> | null = null;
  private closed = false;

  private readonly recoverPlayback = () => {
    if (
      this.closed ||
      !this.playbackPending ||
      (this.context.state !== "suspended" &&
        this.context.state !== "interrupted")
    ) {
      return;
    }
    if (
      typeof document !== "undefined" &&
      document.visibilityState === "hidden"
    ) {
      return;
    }
    if (this.recoveryInFlight) return;
    this.recoveryInFlight = this.context
      .resume()
      .then(() => {
        if (!this.closed && this.context.state === "running")
          this.playbackPending = false;
      })
      .catch(() => {
        // Autoplay policy may require a later user gesture; do not spin on errors.
      })
      .finally(() => {
        this.recoveryInFlight = null;
      });
  };

  private volume = 1;
  private interrupted = false;
  private readonly listeners = new Set<PlaybackListener>();
  // Only the id goes to the audio thread
  private readonly chunkMetadata = new Map<number, OutputChunkMetadata>();
  private nextChunkId = 0;
  private interruptTimeout: ReturnType<typeof setTimeout> | null = null;
  private readonly volumeProvider: VolumeProvider;

  private constructor(
    private readonly context: AudioContext,
    private readonly analyser: AnalyserNode,
    private readonly gain: GainNode,
    private readonly worklet: AudioWorkletNode,
    private readonly audioElement: HTMLAudioElement
  ) {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.recoverPlayback);
    }
    this.context.addEventListener("statechange", this.recoverPlayback);
    this.worklet.port.addEventListener("message", this.handleWorkletMessage);
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
    this.listeners.add(listener);
  }

  public removeListener(listener: PlaybackListener): void {
    this.listeners.delete(listener);
  }

  private readonly handleWorkletMessage = (
    event: MessageEvent<WorkletMessage>
  ) => {
    let playbackEvent: PlaybackStateEvent = event as PlaybackStateEvent;
    if (event.data.type === "chunk_start") {
      const { chunkId } = event.data;
      const metadata = this.chunkMetadata.get(chunkId);
      // Chunks play in order, so earlier ids are done
      for (const id of this.chunkMetadata.keys()) {
        if (id > chunkId) break;
        this.chunkMetadata.delete(id);
      }
      if (!metadata) return;
      playbackEvent = new MessageEvent("message", {
        data: { type: "chunk_start", ...metadata },
      });
    }
    for (const listener of this.listeners) {
      listener(playbackEvent);
    }
  };

  public setVolume(volume: number): void {
    this.volume = volume;
    this.gain.gain.value = volume;
  }

  public playAudio(chunk: ArrayBuffer, metadata?: OutputChunkMetadata): void {
    this.playbackPending ||= this.context.state !== "running";
    this.recoverPlayback();
    this.gain.gain.cancelScheduledValues(this.context.currentTime);
    this.gain.gain.value = this.volume;
    if (this.interruptTimeout) {
      clearTimeout(this.interruptTimeout);
      this.interruptTimeout = null;
    }
    this.worklet.port.postMessage({ type: "clearInterrupted" });
    let chunkId: number | undefined;
    if (metadata) {
      chunkId = ++this.nextChunkId;
      this.chunkMetadata.set(chunkId, metadata);
    }
    this.worklet.port.postMessage({ type: "buffer", buffer: chunk, chunkId });
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
    this.closed = true;
    this.playbackPending = false;
    this.context.removeEventListener("statechange", this.recoverPlayback);
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.recoverPlayback);
    }
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
