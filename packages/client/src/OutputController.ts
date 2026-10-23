import type { FormatConfig } from "./utils/BaseConnection.js";
import type { AudioAlignmentEvent } from "./types.js";
import type { AnalyserNodeLike } from "./platformTypes.js";

export type OutputDeviceConfig = {
  outputDeviceId?: string;
};

export type OutputConfig = OutputDeviceConfig;

// Passed to playback listeners when the chunk starts playing
export type OutputChunkMetadata = {
  event_id: number;
  alignment: AudioAlignmentEvent;
};

// Audio data events from connection to output device
export type OutputAudioEvent = {
  audio_base_64: string;
  metadata?: OutputChunkMetadata;
};
export type OutputListener = (event: OutputAudioEvent) => void;

export type OutputEventTarget = {
  addListener(listener: OutputListener): void;
  removeListener(listener: OutputListener): void;
};

// Playback state events from output worklet
export type PlaybackStateEvent = {
  readonly data:
    | {
        type: "process";
        finished: boolean;
      }
    | ({ type: "chunk_start" } & OutputChunkMetadata);
};
export type PlaybackListener = (event: PlaybackStateEvent) => void;

export type PlaybackEventTarget = {
  addListener(listener: PlaybackListener): void;
  removeListener(listener: PlaybackListener): void;
};

export interface OutputController {
  close(): Promise<void>;
  setDevice(config?: Partial<FormatConfig> & OutputDeviceConfig): Promise<void>;
  setVolume(volume: number): void;
  interrupt(resetDuration?: number): void;

  /**
   * @deprecated AnalyserNode is a web-only API and will not work on all
   * platforms. Use {@link getVolume} for a scalar audio level (0-1) or
   * {@link getByteFrequencyData} for frequency band data instead.
   */
  getAnalyser(): AnalyserNodeLike | undefined;

  /** Returns current audio level as a scalar 0–1. */
  getVolume(): number;
  /**
   * Writes byte frequency data (0-255) into the provided buffer, focused on
   * the human voice range (100-8000 Hz). The buffer length determines the
   * number of frequency bands returned.
   */
  getByteFrequencyData(buffer: Uint8Array<ArrayBuffer>): void;
}
