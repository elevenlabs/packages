import type { RemoteAudioTrack } from "livekit-client";
import type { FormatConfig } from "../../utils/BaseConnection.js";
import type {
  WebRTCAudioAdapter,
  AnalysisResult,
} from "../../WebRTCAudioAdapter.js";
import { loadRawAudioProcessor } from "./rawAudioProcessor.generated.js";
import { createAnalyserVolumeProvider } from "./volumeProvider.js";

/**
 * Web implementation of {@link WebRTCAudioAdapter}.
 *
 * Uses AudioContext, HTMLAudioElement, and AudioWorkletNode to:
 * - Attach remote audio tracks for playback via the DOM
 * - Analyse input/output volume via AnalyserNode
 * - Capture raw output audio via an AudioWorklet for the `onAudio` callback
 */
export class WebAudioAdapter implements WebRTCAudioAdapter {
  private audioElements: HTMLAudioElement[] = [];

  private inputAudioContext: AudioContext | null = null;
  private audioCaptureContext: AudioContext | null = null;

  async attachRemoteTrack(
    track: RemoteAudioTrack,
    outputDeviceId: string | null
  ): Promise<void> {
    const audioElement = track.attach();
    audioElement.autoplay = true;
    audioElement.controls = false;

    // Set output device if one was previously selected
    if (outputDeviceId && audioElement.setSinkId) {
      try {
        await audioElement.setSinkId(outputDeviceId);
      } catch (error) {
        console.warn(
          "Failed to set output device for new audio element:",
          error
        );
      }
    }

    // Add to DOM (hidden) to ensure it plays
    audioElement.style.display = "none";
    document.body.appendChild(audioElement);

    // Store reference for volume control and cleanup
    this.audioElements.push(audioElement);
  }

  setupInputAnalysis(mediaStreamTrack: MediaStreamTrack): AnalysisResult {
    // Clean up previous input audio context
    if (this.inputAudioContext) {
      this.inputAudioContext.close().catch(() => {});
      this.inputAudioContext = null;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    const source = ctx.createMediaStreamSource(
      new MediaStream([mediaStreamTrack])
    );
    source.connect(analyser);

    this.inputAudioContext = ctx;

    return {
      volumeProvider: createAnalyserVolumeProvider(analyser, ctx.sampleRate),
      analyser,
    };
  }

  async setupOutputAnalysis(
    track: RemoteAudioTrack,
    format: FormatConfig,
    onAudioData: (audioData: ArrayBuffer, maxVolume: number) => void
  ): Promise<AnalysisResult> {
    // Clean up previous audio capture context
    if (this.audioCaptureContext) {
      this.audioCaptureContext.close().catch(() => {});
      this.audioCaptureContext = null;
    }

    // Create audio context for processing
    const audioContext = new AudioContext();
    this.audioCaptureContext = audioContext;

    // Create analyser for frequency data
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;
    // Create MediaStream from the track
    const mediaStream = new MediaStream([track.mediaStreamTrack]);

    // Create audio source from the stream
    const source = audioContext.createMediaStreamSource(mediaStream);

    const volumeProvider = createAnalyserVolumeProvider(
      analyser,
      audioContext.sampleRate
    );

    await loadRawAudioProcessor(audioContext.audioWorklet);
    const worklet = new AudioWorkletNode(audioContext, "rawAudioProcessor");

    // Configure the processor and set up the message listener
    // before connecting the graph, so no early messages are missed.
    worklet.port.postMessage({
      type: "setFormat",
      format: format.format,
      sampleRate: format.sampleRate,
    });
    worklet.port.onmessage = (event: MessageEvent) => {
      const [audioData, maxVolume] = event.data;
      onAudioData(audioData.buffer, maxVolume);
    };

    // Connect the audio graph: source → analyser → worklet
    source.connect(analyser);
    analyser.connect(worklet);

    return { volumeProvider, analyser };
  }

  setVolume(volume: number): void {
    for (const element of this.audioElements) {
      element.volume = volume;
    }
  }

  async setOutputDevice(deviceId: string): Promise<void> {
    if (!("setSinkId" in HTMLAudioElement.prototype)) {
      throw new Error("setSinkId is not supported in this browser");
    }

    await Promise.all(
      this.audioElements.map(async element => {
        try {
          await element.setSinkId(deviceId);
        } catch (error) {
          console.error("Failed to set sink ID for audio element:", error);
          throw error;
        }
      })
    );
  }

  cleanup(): void {
    // Clean up input audio context
    if (this.inputAudioContext) {
      this.inputAudioContext.close().catch(error => {
        console.warn("Error closing input audio context:", error);
      });
      this.inputAudioContext = null;
    }

    // Clean up audio capture context
    if (this.audioCaptureContext) {
      this.audioCaptureContext.close().catch(error => {
        console.warn("Error closing audio capture context:", error);
      });
      this.audioCaptureContext = null;
    }

    // Clean up audio elements
    for (const element of this.audioElements) {
      element.remove();
    }
    this.audioElements = [];
  }
}
