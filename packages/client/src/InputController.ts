import type { FormatConfig } from "./utils/BaseConnection";

export type InputDeviceConfig = {
  inputDeviceId?: string;
  preferHeadphonesForIosDevices?: boolean;
};

export interface InputController {
  close(): Promise<void>;
  setDevice(config?: Partial<FormatConfig> & InputDeviceConfig): Promise<void>;
  setMuted(isMuted: boolean): Promise<void>;
  isMuted(): boolean;
  readonly analyser?: AnalyserNode;
}
