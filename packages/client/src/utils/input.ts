import { loadRawAudioProcessor } from "./rawAudioProcessor.generated";
import type { FormatConfig } from "./connection";
import { isIosDevice } from "./compatibility";
import type { AudioWorkletConfig } from "../BaseConversation";

export type InputConfig = {
  preferHeadphonesForIosDevices?: boolean;
  inputDeviceId?: string;
};

const LIBSAMPLERATE_JS =
  "https://cdn.jsdelivr.net/npm/@alexanderolsen/libsamplerate-js@2.1.2/dist/libsamplerate.worklet.js";

const defaultConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  // Automatic gain control helps maintain a steady volume level with microphones: https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings/autoGainControl
  autoGainControl: true,
  // Mono audio for better echo cancellation
  channelCount: { ideal: 1 },
};

export class Input {
  public static async create({
    sampleRate,
    format,
    preferHeadphonesForIosDevices,
    inputDeviceId,
    workletPaths,
    libsampleratePath,
  }: FormatConfig & InputConfig & AudioWorkletConfig): Promise<Input> {
    let context: AudioContext | null = null;
    let inputStream: MediaStream | null = null;

    try {
      const options: MediaTrackConstraints = {
        sampleRate: { ideal: sampleRate },
        ...defaultConstraints,
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

      if (inputDeviceId) {
        options.deviceId = Input.getDeviceIdConstraint(inputDeviceId);
      }

      const supportsSampleRateConstraint =
        navigator.mediaDevices.getSupportedConstraints().sampleRate;

      context = new window.AudioContext(
        supportsSampleRateConstraint ? { sampleRate } : {}
      );
      const analyser = context.createAnalyser();
      if (!supportsSampleRateConstraint) {
        // Use custom libsamplerate path if provided, otherwise fallback to CDN
        const libsamplerateUrl = libsampleratePath || LIBSAMPLERATE_JS;
        await context.audioWorklet.addModule(libsamplerateUrl);
      }
      await loadRawAudioProcessor(
        context.audioWorklet,
        workletPaths?.["rawAudioProcessor"]
      );

      const constraints = { voiceIsolation: true, ...options };
      inputStream = await navigator.mediaDevices.getUserMedia({
        audio: constraints,
      });

      const source = context.createMediaStreamSource(inputStream);
      const worklet = new AudioWorkletNode(context, "rawAudioProcessor");
      worklet.port.postMessage({ type: "setFormat", format, sampleRate });

      source.connect(analyser);
      analyser.connect(worklet);

      await context.resume();

      const permissions = await navigator.permissions.query({
        name: "microphone",
      });
      return new Input(
        context,
        analyser,
        worklet,
        inputStream,
        source,
        permissions
      );
    } catch (error) {
      inputStream?.getTracks().forEach(track => {
        track.stop();
      });
      context?.close();
      throw error;
    }
  }

  // Use { ideal } on iOS as a defensive measure - some iOS versions may not support { exact } for deviceId constraints
  private static getDeviceIdConstraint(
    inputDeviceId?: string
  ): MediaTrackConstraints["deviceId"] {
    if (!inputDeviceId) {
      return undefined;
    }
    return isIosDevice() ? { ideal: inputDeviceId } : { exact: inputDeviceId };
  }

  private constructor(
    public readonly context: AudioContext,
    public readonly analyser: AnalyserNode,
    public readonly worklet: AudioWorkletNode,
    public inputStream: MediaStream,
    private mediaStreamSource: MediaStreamAudioSourceNode,
    private permissions: PermissionStatus
  ) {
    this.permissions.addEventListener("change", this.handlePermissionsChange);
  }

  private forgetInputStreamAndSource() {
    for (const track of this.inputStream.getTracks()) {
      track.stop();
    }
    this.mediaStreamSource.disconnect();
  }

  public async close() {
    this.forgetInputStreamAndSource();
    this.permissions.removeEventListener(
      "change",
      this.handlePermissionsChange
    );
    await this.context.close();
  }

  public setMuted(isMuted: boolean) {
    this.worklet.port.postMessage({ type: "setMuted", isMuted });
  }

  public async setInputDevice(inputDeviceId?: string): Promise<void> {
    try {
      // Create new constraints with the specified device or use default
      const options: MediaTrackConstraints = {
        ...defaultConstraints,
      };

      if (inputDeviceId) {
        options.deviceId = Input.getDeviceIdConstraint(inputDeviceId);
      }
      // If inputDeviceId is undefined, don't set deviceId constraint - browser uses default

      const constraints = { voiceIsolation: true, ...options };

      // Get new media stream with the specified device before forgetting the old one
      // this prevents unintended interruption of the audio stream in case the new stream isn't obtained
      const newInputStream = await navigator.mediaDevices.getUserMedia({
        audio: constraints,
      });

      this.forgetInputStreamAndSource();

      // Replace the stream and create new source
      this.inputStream = newInputStream;
      this.mediaStreamSource =
        this.context.createMediaStreamSource(newInputStream);

      // Reconnect the audio graph
      this.mediaStreamSource.connect(this.analyser);
    } catch (error) {
      console.error("Failed to switch input device:", error);
      throw error;
    }
  }

  private handlePermissionsChange = () => {
    const [track] = this.inputStream.getAudioTracks();
    const { deviceId } = track.getSettings();
    if (this.permissions.state === "denied") {
      console.error("Microphone permission denied");
      // TODO: Tell the user to grant permission in some other way
    } else if (
      this.permissions.state === "prompt" ||
      (this.permissions.state === "granted" && track.readyState === "ended")
    ) {
      // Assuming this track was stopped because the user denied permission
      // - let's try to re-set the input device
      this.setInputDevice(deviceId);
    }
  };
}
