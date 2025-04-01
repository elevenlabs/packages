import { rawAudioProcessor } from "./rawAudioProcessor";
import { FormatConfig } from "./connection";
import { isIosDevice } from "./compatibility";

export type InputConfig = {
  preferHeadphonesForIosDevices?: boolean;
};

const LIBSAMPLERATE_JS =
  "https://cdn.jsdelivr.net/npm/@alexanderolsen/libsamplerate-js@2.1.2/dist/libsamplerate.worklet.js";

export class Input {
  public static async create({
    sampleRate,
    format,
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

      if (isIosDevice() && preferHeadphonesForIosDevices) {
        const availableDevices =
          await window.navigator.mediaDevices.enumerateDevices();
        const idealDevice = availableDevices.find(
          d =>
            // cautious to include "bluetooth" in the search
            // as might trigger bluetooth speakers
            d.kind === "audioinput" &&
            ["airpod", "headphone", "earphone"].find(keyword =>
              d.label.toLowerCase().includes(keyword)
            )
        );
        if (idealDevice) {
          options.deviceId = { ideal: idealDevice.deviceId };
        }
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

      const source = context.createMediaStreamSource(inputStream);
      const worklet = new AudioWorkletNode(context, "raw-audio-processor");
      worklet.port.postMessage({ type: "setFormat", format, sampleRate });

      source.connect(analyser);
      analyser.connect(worklet);

      await context.resume();

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
    public inputStream: MediaStream
  ) {}

  public async close() {
    this.inputStream.getTracks().forEach(track => track.stop());
    await this.context.close();
  }

  public setMuted(isMuted: boolean) {
    this.worklet.port.postMessage({ type: "setMuted", isMuted });
  }

  public async setInputDevice(deviceId: string): Promise<boolean> {
    try {
      this.inputStream.getTracks().forEach(track => track.stop());

      await this.context.suspend();
      
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
        },
      });
      
      this.analyser.disconnect();      
      const newSource = this.context.createMediaStreamSource(newStream);
      newSource.connect(this.analyser);
      this.analyser.connect(this.worklet);

      this.inputStream = newStream;

      await this.context.resume();

      return true;
    } catch (error) {
      try {
        await this.context.resume();
      } catch (resumeError) {
        console.error("Error resuming audio context:", resumeError);
        return false;
      }

      console.error("Error switching input device:", error);
      return false;
    }
  }
}
