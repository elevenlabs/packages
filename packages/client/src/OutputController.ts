import type { FormatConfig } from "./utils/BaseConnection.js";

export type OutputDeviceConfig = {
  outputDeviceId?: string;
};

export interface OutputController {
  close(): Promise<void>;
  setDevice(config?: Partial<FormatConfig> & OutputDeviceConfig): Promise<void>;
  setVolume(volume: number): void;
  interrupt(resetDuration?: number): void;

  /** @deprecated Use getVolume() or getByteFrequencyData() instead. */
  getAnalyser(): AnalyserNode | undefined;

  /** Returns current audio level as a scalar 0–1. */
  getVolume(): number;
  /** Writes byte frequency data into the provided buffer. */
  getByteFrequencyData(buffer: Uint8Array<ArrayBuffer>): void;
}
