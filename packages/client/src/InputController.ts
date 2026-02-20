import type { FormatConfig } from "./utils/BaseConnection";

export type InputDeviceConfig = {
  deviceId?: string;
  preferHeadphonesForIosDevices?: boolean;
};

export interface InputController {
  close(): Promise<void>;
  setInputDevice(
    config?: Partial<FormatConfig> & InputDeviceConfig
  ): Promise<void>;
  setMuted(isMuted: boolean): void;
  readonly isMuted: boolean;
  readonly analyser?: AnalyserNode;
}

// Workaround: microbundle tree-shakes pure type-only modules, preventing .d.ts generation.
// This dummy export forces the module to be included in the build.
// TODO: Remove this once we migrate from microbundle to the TypeScript compiler.
export const __inputControllerModule = true;
