import { loadRawAudioProcessor } from "./rawAudioProcessor.generated";
import type { FormatConfig } from "./connection";
import { isIosDevice } from "./compatibility";
import type { AudioWorkletConfig } from "../BaseConversation";
import type { InputController, InputDeviceConfig } from "../InputController";

export type InputConfig = InputDeviceConfig & {
  onError?(message: string, context?: unknown): void;
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

export type InputMessageEvent = MessageEvent<[Uint8Array, number]>;
export type InputListener = (event: InputMessageEvent) => void;

export type InputEventTarget = {
  addListener(listener: InputListener): void;
  removeListener(listener: InputListener): void;
};

export class MediaDeviceInput implements InputController, InputEventTarget {
  public static async create({
    sampleRate,
    format,
    preferHeadphonesForIosDevices,
    deviceId,
    workletPaths,
    libsampleratePath,
    onError,
  }: FormatConfig &
    InputConfig &
    AudioWorkletConfig): Promise<MediaDeviceInput> {
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

      if (deviceId) {
        options.deviceId = MediaDeviceInput.getDeviceIdConstraint(deviceId);
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
      return new MediaDeviceInput(
        context,
        analyser,
        worklet,
        inputStream,
        source,
        permissions,
        onError
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
    deviceId?: string
  ): MediaTrackConstraints["deviceId"] {
    if (!deviceId) {
      return undefined;
    }
    return isIosDevice() ? { ideal: deviceId } : { exact: deviceId };
  }

  private muted = false;

  private constructor(
    private readonly context: AudioContext,
    public readonly analyser: AnalyserNode,
    private readonly worklet: AudioWorkletNode,
    private inputStream: MediaStream,
    private mediaStreamSource: MediaStreamAudioSourceNode,
    private permissions: PermissionStatus,
    private onError: (
      message: string,
      context?: unknown
    ) => void = console.error
  ) {
    this.permissions.addEventListener("change", this.handlePermissionsChange);
    // Start the MessagePort to enable addEventListener to work
    // (required when using addEventListener instead of onmessage)
    this.worklet.port.start();
  }

  public get isMuted(): boolean {
    return this.muted;
  }

  public addListener(listener: InputListener): void {
    this.worklet.port.addEventListener("message", listener);
  }

  public removeListener(listener: InputListener): void {
    this.worklet.port.removeEventListener("message", listener);
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
    this.muted = isMuted;
    this.worklet.port.postMessage({ type: "setMuted", isMuted });
  }

  private settingInput: boolean = false;
  public async setInputDevice(
    config?: Partial<FormatConfig> & InputDeviceConfig
  ): Promise<void> {
    try {
      if (this.settingInput) {
        throw new Error("Input device is already being set");
      }
      this.settingInput = true;

      // Extract deviceId from config
      const deviceId = config?.deviceId;

      // Note: sampleRate, format, and preferHeadphonesForIosDevices cannot be
      // changed on an existing input (would require recreating the AudioContext).
      // These options are only used during initial MediaDeviceInput.create()

      // Create new constraints with the specified device or use default
      const options: MediaTrackConstraints = {
        ...defaultConstraints,
      };

      if (deviceId) {
        options.deviceId = MediaDeviceInput.getDeviceIdConstraint(deviceId);
      }
      // If deviceId is undefined, don't set deviceId constraint - browser uses default

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
      this.onError("Failed to switch input device:", error);
      throw error;
    } finally {
      this.settingInput = false;
    }
  }

  private handlePermissionsChange = () => {
    if (this.permissions.state === "denied") {
      this.onError("Microphone permission denied");
      // TODO: Tell the user to grant permission in some other way
    } else if (!this.settingInput) {
      // Let's try to reset the input device, but only if we're not already in the process of setting it
      const [track] = this.inputStream.getAudioTracks();
      const { deviceId } = track?.getSettings() ?? {};
      this.setInputDevice({ deviceId }).catch(error => {
        this.onError(
          "Failed to reset input device after permission change:",
          error
        );
      });
    }
  };
}
