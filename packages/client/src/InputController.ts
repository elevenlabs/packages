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
  setInputMuted(isMuted: boolean): Promise<void>;
  isMuted(): boolean;
  readonly analyser?: AnalyserNode;
}
