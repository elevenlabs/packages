import { loadAudioConcatProcessor } from "./audioConcatProcessor";
import { FormatConfig } from "./connection";

export type OutputConfig = {
  outputDeviceId?: string;
};

export class Output {
  public static async create({
    sampleRate,
    format,
    outputDeviceId,
  }: FormatConfig & OutputConfig): Promise<Output> {
    let context: AudioContext | null = null;
    try {
      context = new AudioContext({ sampleRate });
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      gain.connect(analyser);

      // Try to set the output device if specified and supported
      if (outputDeviceId && "setSinkId" in AudioContext.prototype) {
        await (context as any).setSinkId(outputDeviceId);
      }

      analyser.connect(context.destination);
      await loadAudioConcatProcessor(context.audioWorklet);
      const worklet = new AudioWorkletNode(context, "audio-concat-processor");
      worklet.port.postMessage({ type: "setFormat", format });
      worklet.connect(gain);

      await context.resume();

      return new Output(context, analyser, gain, worklet);
    } catch (error) {
      context?.close();
      throw error;
    }
  }

  private constructor(
    public readonly context: AudioContext,
    public readonly analyser: AnalyserNode,
    public readonly gain: GainNode,
    public readonly worklet: AudioWorkletNode
  ) {}

  public async close() {
    await this.context.close();
  }
}
