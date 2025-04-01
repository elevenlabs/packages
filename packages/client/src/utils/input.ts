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
      
      if (inputDeviceId && currentDeviceId !== inputDeviceId) {
        console.warn(`Requested device ID ${inputDeviceId} but got ${currentDeviceId}`);
      }
      
      console.log(`Using input device: ${currentDeviceId}`);

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
      // Stop all tracks in the existing stream
      this.inputStream.getTracks().forEach(track => track.stop());
      
      // Suspend the audio context temporarily
      await this.context.suspend();
      
      // Get a new stream with the requested device
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: { ideal: true },
          noiseSuppression: { ideal: true },
        },
      });
      
      // Verify that we got the requested device
      const activeTrack = newStream.getAudioTracks()[0];
      const actualDeviceId = activeTrack.getSettings().deviceId;
      
      if (!actualDeviceId) {
        throw new Error("Failed to get device ID from new audio track");
      }
      
      // Disconnect all nodes in the audio graph
      this.analyser.disconnect();
      
      // Create a new source node with the new stream
      const newSource = this.context.createMediaStreamSource(newStream);
      
      // Create a new connection path
      newSource.connect(this.analyser);
      this.analyser.connect(this.worklet);
      
      // Store the new stream (we need to use Object.defineProperty because inputStream is readonly)
      Object.defineProperty(this, 'inputStream', { value: newStream });
      
      // Update the current device ID
      this.currentDeviceId = actualDeviceId;

      // Resume the audio context to restart processing
      await this.context.resume();
      
      console.log(`Successfully switched input device to: ${actualDeviceId}`);
    } catch (error) {
      // Try to resume the context even if there was an error
      try {
        await this.context.resume();
      } catch (resumeError) {
        console.error("Error resuming audio context:", resumeError);
      }
      
      console.error("Error switching input device:", error);
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
