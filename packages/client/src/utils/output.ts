import { audioConcatProcessor } from "./audioConcatProcessor";
import { FormatConfig } from "./connection";

export class Output {
  private audioElement: HTMLAudioElement | null = null;
  private mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;

  public static async create({
    sampleRate,
    format,
  }: FormatConfig): Promise<Output> {
    let context: AudioContext | null = null;
    try {
      context = new AudioContext({ sampleRate });
      const analyser = context.createAnalyser();
      const gain = context.createGain();
      gain.connect(analyser);
      analyser.connect(context.destination);
      await context.audioWorklet.addModule(audioConcatProcessor);
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
    this.audioElement?.pause();
    this.audioElement = null;
    this.mediaStreamDestination = null;
    await this.context.close();
  }

  public async setOutputDevice(deviceId: string): Promise<boolean> {
    // Check if the device is supported
    if (!('setSinkId' in HTMLAudioElement.prototype)) {
      return false;
    }

    // Create a MediaStreamDestination if we don't have one yet
    if (!this.mediaStreamDestination) {
      this.mediaStreamDestination = this.context.createMediaStreamDestination();

      // Disconnect analyser from its current destination
      this.analyser.disconnect();
      
      // Connect to our new MediaStreamDestination
      this.analyser.connect(this.mediaStreamDestination);
      
      // Create an audio element if we don't have one
      if (!this.audioElement) {
        this.audioElement = new Audio();
        this.audioElement.srcObject = this.mediaStreamDestination.stream;
        this.audioElement.play();
      }
    }

      // Set the sink ID on the audio element
    await (this.audioElement as any).setSinkId(deviceId);

    return true;
  }
}
