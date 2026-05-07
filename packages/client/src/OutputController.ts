import type { FormatConfig } from "./utils/BaseConnection.js";
import type { AudioStreamListener } from "./AudioStream.js";

export type OutputDeviceConfig = {
  outputDeviceId?: string;
};

export interface OutputController {
  close(): Promise<void>;
  setDevice(config?: Partial<FormatConfig> & OutputDeviceConfig): Promise<void>;
  setVolume(volume: number): void;
  interrupt(resetDuration?: number): void;
  /** Returns the assistant output audio stream, if one is available. */
  getAudioStream(): MediaStream | null;
  addAudioStreamListener(listener: AudioStreamListener): void;
  removeAudioStreamListener(listener: AudioStreamListener): void;

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
