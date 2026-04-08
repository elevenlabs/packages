import type { FormatConfig } from "./utils/BaseConnection.js";

export type OutputDeviceConfig = {
  outputDeviceId?: string;
};

export interface OutputController {
  close(): Promise<void>;
  setDevice(config?: Partial<FormatConfig> & OutputDeviceConfig): Promise<void>;
  setVolume(volume: number): void;
  interrupt(resetDuration?: number): void;
  getAnalyser(): AnalyserNode | undefined;
  getVolume(): number;
}
