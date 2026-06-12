import type { FormatConfig } from "./utils/BaseConnection.js";

/** Default microphone audio chunk duration sent to the agent (WebSocket path). */
export const DEFAULT_INPUT_CHUNK_DURATION_MS = 25;

export type InputDeviceConfig = {
  inputDeviceId?: string;
  preferHeadphonesForIosDevices?: boolean;
};

export type InputConfig = InputDeviceConfig & {
  onError?(message: string, context?: unknown): void;
  /**
   * Duration of each microphone audio chunk sent to the agent, in milliseconds.
   * Only applies to the WebSocket input path (AudioWorklet). Default: 25.
   */
  inputChunkDurationMs?: number;
};

export type InputMessageEvent = MessageEvent<[Uint8Array, number]>;
export type InputListener = (event: InputMessageEvent) => void;

export type InputEventTarget = {
  addListener(listener: InputListener): void;
  removeListener(listener: InputListener): void;
};

export interface InputController {
  close(): Promise<void>;
  setDevice(config?: Partial<FormatConfig> & InputDeviceConfig): Promise<void>;
  setMuted(isMuted: boolean): Promise<void>;
  isMuted(): boolean;

  /**
   * @deprecated AnalyserNode is a web-only API and will not work on all
   * platforms. Use {@link getVolume} for a scalar audio level (0-1) or
   * {@link getByteFrequencyData} for frequency band data instead.
   */
  getAnalyser(): AnalyserNode | undefined;

  /** Returns current audio level as a scalar 0–1. */
  getVolume(): number;
  /**
   * Writes byte frequency data (0-255) into the provided buffer, focused on
   * the human voice range (100-8000 Hz). The buffer length determines the
   * number of frequency bands returned.
   */
  getByteFrequencyData(buffer: Uint8Array<ArrayBuffer>): void;
}
