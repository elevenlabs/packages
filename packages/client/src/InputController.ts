import type { FormatConfig } from "./utils/BaseConnection.js";

export type InputDeviceConfig = {
  inputDeviceId?: string;
  preferHeadphonesForIosDevices?: boolean;
};

export interface InputController {
  close(): Promise<void>;
  setDevice(config?: Partial<FormatConfig> & InputDeviceConfig): Promise<void>;
  setMuted(isMuted: boolean): Promise<void>;
  isMuted(): boolean;

  /** @deprecated Use getVolume() or getByteFrequencyData() instead. */
  getAnalyser(): AnalyserNode | undefined;

  /** Returns current audio level as a scalar 0–1. */
  getVolume(): number;
  /** Writes byte frequency data into the provided buffer. */
  getByteFrequencyData(buffer: Uint8Array<ArrayBuffer>): void;
}
