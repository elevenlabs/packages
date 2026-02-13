export interface InputController {
  close(): Promise<void>;
  setInputDevice(deviceId?: string): Promise<void>;
  setMuted(isMuted: boolean): void;
  readonly isMuted: boolean;
  readonly analyser?: AnalyserNode;
}
