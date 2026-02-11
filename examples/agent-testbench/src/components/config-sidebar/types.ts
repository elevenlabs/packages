import type { BaseSessionConfig, ConnectionType } from "@elevenlabs/client";

export type BaseConfigProps = {
  value: BaseSessionConfig & { connectionType?: ConnectionType };
  onChange: (
    connectionType: BaseSessionConfig & { connectionType?: ConnectionType }
  ) => void;
  disabled: boolean;
};
