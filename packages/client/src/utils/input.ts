import { rawAudioProcessor } from "./rawAudioProcessor";
import { FormatConfig } from "./connection";

const LIBSAMPLERATE_JS =
  "https://cdn.jsdelivr.net/npm/@alexanderolsen/libsamplerate-js@2.1.2/dist/libsamplerate.worklet.js";

export class Input {
  public static async create({
    sampleRate,
    format,
  }: FormatConfig): Promise<Input> {
    let context: AudioContext | null = null;
    let inputStream: MediaStream | null = null;

    try {
      // some browsers won't allow calling getSupportedConstraints
      // before getting approval for microphone access
      const preliminaryInputStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      preliminaryInputStream?.getTracks().forEach(track => track.stop());

      const supportsSampleRateConstraint =
        navigator.mediaDevices.getSupportedConstraints().sampleRate;

      context = new window.AudioContext(
        supportsSampleRateConstraint ? { sampleRate } : {}
      );
      const analyser = context.createAnalyser();
      if (!supportsSampleRateConstraint) {
        await context.audioWorklet.addModule(LIBSAMPLERATE_JS);
      }
      await context.audioWorklet.addModule(rawAudioProcessor);

      inputStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: { ideal: sampleRate },
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
        },
      });

      const source = context.createMediaStreamSource(inputStream);
      const worklet = new AudioWorkletNode(context, "raw-audio-processor");
      worklet.port.postMessage({ type: "setFormat", format, sampleRate });

      source.connect(analyser);
      analyser.connect(worklet);

      return new Input(context, analyser, worklet, inputStream);
    } catch (error) {
      inputStream?.getTracks().forEach(track => track.stop());
      context?.close();
      throw error;
    }
  }

  private constructor(
    public readonly context: AudioContext,
    public readonly analyser: AnalyserNode,
    public readonly worklet: AudioWorkletNode,
    public readonly inputStream: MediaStream
  ) {}

  public async close() {
    this.inputStream.getTracks().forEach(track => track.stop());
    await this.context.close();
  }
}
