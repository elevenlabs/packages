import type { BaseSessionConfig } from "@elevenlabs/client";

export type BaseConfigProps = {
  value: BaseSessionConfig & {
    connectionType?: "websocket" | "webrtc";
  };
  onChange: (
    connectionType: BaseSessionConfig & {
      connectionType?: "websocket" | "webrtc";
    }
  ) => void;
  disabled: boolean;
};
