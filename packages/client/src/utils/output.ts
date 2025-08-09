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
    try {
      context = new AudioContext({ sampleRate });
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      gain.connect(analyser);
      analyser.connect(context.destination);

      audioElement = new Audio();
      audioElement.src = "";
      audioElement.load();

      const newSource = context.createMediaElementSource(audioElement);
      newSource.connect(gain);

      await loadAudioConcatProcessor(context.audioWorklet);
      const worklet = new AudioWorkletNode(context, "audio-concat-processor");
      worklet.port.postMessage({ type: "setFormat", format });
      worklet.connect(gain);

      await context.resume();

      if (outputDeviceId && audioElement.setSinkId) {
        await audioElement.setSinkId(outputDeviceId);
      }

      const newOutput = new Output(
        context,
        analyser,
        gain,
        worklet,
        audioElement
      );

      return newOutput;
    } catch (error) {
      context?.close();
      audioElement?.pause();
      throw error;
    }
  }

  private constructor(
    public readonly context: AudioContext,
    public readonly analyser: AnalyserNode,
    public readonly gain: GainNode,
    public readonly worklet: AudioWorkletNode,
    public readonly audioElement: HTMLAudioElement
  ) {}

  public async close() {
    await this.context.close();
  }
}
