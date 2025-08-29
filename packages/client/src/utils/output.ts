import { loadAudioConcatProcessor } from "./audioConcatProcessor";
import type { FormatConfig } from "./connection";

export class Output {
  public static async create({
    sampleRate,
    format,
    outputDeviceId,
  }: FormatConfig): Promise<Output> {
    let context: AudioContext | null = null;
    let audioElement: HTMLAudioElement | null = null;
    let audioSource: MediaElementAudioSourceNode | null = null;
    try {
      context = new AudioContext({ sampleRate });
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      gain.connect(analyser);
      analyser.connect(context.destination);

      if (outputDeviceId) {
        audioElement = new Audio();
        audioElement.src = "";
        audioElement.load();

        audioSource = context.createMediaElementSource(audioElement);
        audioSource.connect(gain);
      }

      await loadAudioConcatProcessor(context.audioWorklet);
      const worklet = new AudioWorkletNode(context, "audio-concat-processor");
      worklet.port.postMessage({ type: "setFormat", format });
      worklet.connect(gain);

      await context.resume();

      if (outputDeviceId && audioElement?.setSinkId) {
        await audioElement.setSinkId(outputDeviceId);
      }

      const newOutput = new Output(
        context,
        analyser,
        gain,
        worklet,
        audioElement,
        audioSource
      );

      return newOutput;
    } catch (error) {
      audioSource?.disconnect();
      audioElement?.pause();
      if (context && context.state !== "closed") {
        await context.close();
      }

      throw error;
    }
  }

  private constructor(
    public readonly context: AudioContext,
    public readonly analyser: AnalyserNode,
    public readonly gain: GainNode,
    public readonly worklet: AudioWorkletNode,
    public readonly audioElement: HTMLAudioElement | null,
    public readonly audioSource: MediaElementAudioSourceNode | null
  ) {}

  public async close() {
    this.audioSource?.disconnect();
    this.audioElement?.pause();
    await this.context.close();
  }
}
