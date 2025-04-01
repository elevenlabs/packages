import { rawAudioProcessor } from "./rawAudioProcessor";
import { FormatConfig } from "./connection";
import { isIosDevice } from "./compatibility";

export type InputConfig = {
  inputDeviceId?: string;
  preferHeadphonesForIosDevices?: boolean;
};

const LIBSAMPLERATE_JS =
  "https://cdn.jsdelivr.net/npm/@alexanderolsen/libsamplerate-js@2.1.2/dist/libsamplerate.worklet.js";

export class Input {
  private currentDeviceId: string | null = null;

  public static async create({
    sampleRate,
    format,
    inputDeviceId,
    preferHeadphonesForIosDevices,
  }: FormatConfig & InputConfig): Promise<Input> {
    let context: AudioContext | null = null;
    let inputStream: MediaStream | null = null;

    try {
      const options: MediaTrackConstraints = {
        sampleRate: { ideal: sampleRate },
        echoCancellation: { ideal: true },
        noiseSuppression: { ideal: true },
      };

      if (inputDeviceId) {
        options.deviceId = { exact: inputDeviceId };
      }

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
        audio: options,
      });

      const activeTrack = inputStream.getAudioTracks()[0];
      const currentDeviceId = activeTrack.getSettings().deviceId || null;

      const source = context.createMediaStreamSource(inputStream);
      const worklet = new AudioWorkletNode(context, "raw-audio-processor");
      worklet.port.postMessage({ type: "setFormat", format, sampleRate });

      source.connect(analyser);
      analyser.connect(worklet);

      await context.resume();

      const input = new Input(context, analyser, worklet, inputStream);
      input.currentDeviceId = currentDeviceId;
      return input;
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

  public setMuted(isMuted: boolean) {
    this.worklet.port.postMessage({ type: "setMuted", isMuted });
  }

  public async setInputDevice(deviceId: string): Promise<void> {
    if (this.currentDeviceId === deviceId) {
      return;
    }
    
    try {
      this.inputStream.getTracks().forEach(track => track.stop());
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
        },
      });
      
      const newSource = this.context.createMediaStreamSource(newStream);
      newSource.connect(this.analyser);
      
      Object.defineProperty(this, 'inputStream', { value: newStream });
      this.currentDeviceId = deviceId;
    } catch (error) {
      throw new Error(`Failed to set input device: ${(error as Error).message}`);
    }
  }

  public getCurrentInputDevice(): string | null {
    return this.currentDeviceId;
  }

  public async getInputDevices(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'audioinput');
    } catch (error) {
      throw new Error(`Failed to get input devices: ${(error as Error).message}`);
    }
  }
}
