import { ConnectionType } from "@elevenlabs/client";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "../ui/field";
import { SidebarGroup } from "../ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "../ui/tabs";
import { BaseConfigProps } from "./types";
import { Switch } from "../ui/switch";
import { Input } from "../ui/input";
import { JsonInput } from "../json-input";

function ConnectionTypeField({ value, onChange, disabled }: BaseConfigProps) {
  return (
    <Field>
      <FieldLabel>Connection Type</FieldLabel>
      <Tabs
        defaultValue={value.connectionType ?? "webrtc"}
        onValueChange={newConnectionType =>
          onChange({
            ...value,
            connectionType: newConnectionType as ConnectionType,
          })
        }
      >
        <TabsList>
          <TabsTrigger disabled={disabled} value="webrtc">
            WebRTC
          </TabsTrigger>
          <TabsTrigger disabled={disabled} value="websocket">
            WebSocket
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </Field>
  );
}

function TopLevelTextOnlyField({ value, onChange, disabled }: BaseConfigProps) {
  return (
    <Field className="flex flex-row items-center space-x-2">
      <Switch
        id="session-config-text-only"
        disabled={disabled}
        checked={value.textOnly ?? false}
        onCheckedChange={checked =>
          onChange({
            ...value,
            textOnly: checked,
          })
        }
      />
      <FieldLabel htmlFor="session-config-text-only">Text Only</FieldLabel>
    </Field>
  );
}

function UseWakeLockField({ value, onChange, disabled }: BaseConfigProps) {
  return (
    <Field className="flex flex-row items-center space-x-2">
      <Switch
        id="session-config-use-wake-lock"
        disabled={disabled}
        checked={value.useWakeLock ?? false}
        onCheckedChange={checked =>
          onChange({
            ...value,
            useWakeLock: checked,
          })
        }
      />
      <FieldLabel htmlFor="session-config-use-wake-lock">
        Use Wake Lock
      </FieldLabel>
    </Field>
  );
}

function OriginField({ value, onChange, disabled }: BaseConfigProps) {
  return (
    <Field>
      <FieldLabel htmlFor="session-config-origin">Origin</FieldLabel>
      <Input
        id="session-config-origin"
        disabled={disabled}
        value={value.origin ?? ""}
        onValueChange={origin =>
          onChange({
            ...value,
            origin: origin ? origin : undefined,
          })
        }
      />
    </Field>
  );
}

function AuthorizationField({ value, onChange, disabled }: BaseConfigProps) {
  return (
    <Field>
      <FieldLabel htmlFor="session-config-authorization">
        Authorization
      </FieldLabel>
      <Input
        id="session-config-authorization"
        disabled={disabled}
        value={value.authorization ?? ""}
        onValueChange={authorization =>
          onChange({
            ...value,
            authorization: authorization ? authorization : undefined,
          })
        }
      />
    </Field>
  );
}

function LiveKitUrlField({ value, onChange, disabled }: BaseConfigProps) {
  return (
    <Field>
      <FieldLabel htmlFor="session-config-livekit-url">LiveKit URL</FieldLabel>
      <Input
        id="session-config-livekit-url"
        disabled={disabled}
        value={value.livekitUrl ?? ""}
        onValueChange={livekitUrl =>
          onChange({
            ...value,
            livekitUrl: livekitUrl ? livekitUrl : undefined,
          })
        }
      />
    </Field>
  );
}

function UserIdField({ value, onChange, disabled }: BaseConfigProps) {
  return (
    <Field>
      <FieldLabel htmlFor="session-config-user-id">User ID</FieldLabel>
      <Input
        id="session-config-user-id"
        disabled={disabled}
        value={value.userId ?? ""}
        onValueChange={userId =>
          onChange({
            ...value,
            userId: userId ? userId : undefined,
          })
        }
      />
    </Field>
  );
}

function CustomLlmExtraBodyField({
  value,
  onChange,
  disabled,
}: BaseConfigProps) {
  return (
    <Field>
      <FieldLabel htmlFor="session-config-custom-llm-extra-body">
        Custom LLM Extra Body
      </FieldLabel>
      <JsonInput
        id="session-config-custom-llm-extra-body"
        disabled={disabled}
        value={value.customLlmExtraBody}
        onChange={customLlmExtraBody =>
          onChange({
            ...value,
            customLlmExtraBody,
          })
        }
      />
    </Field>
  );
}

function ConnectionDelayField({ value, onChange, disabled }: BaseConfigProps) {
  return (
    <Field>
      <FieldLabel htmlFor="session-config-connection-delay">
        Connection Delay
      </FieldLabel>
      <FieldDescription>
        The delay in milliseconds to wait before connecting to the server.
      </FieldDescription>
      <Input
        id="session-config-connection-delay"
        placeholder="Default delay (ms)"
        disabled={disabled}
        value={value.connectionDelay?.default ?? ""}
        type="number"
        min={0}
        step={1}
        onValueChange={delay =>
          onChange({
            ...value,
            connectionDelay: delay
              ? {
                  ...value.connectionDelay,
                  default: delay ? parseInt(delay, 10) : 0,
                }
              : undefined,
          })
        }
      />
      <Input
        id="session-config-connection-delay-android"
        placeholder="Android delay (ms)"
        disabled={disabled || !value.connectionDelay}
        value={value.connectionDelay?.android ?? ""}
        type="number"
        min={0}
        step={1}
        onValueChange={delay => {
          if (value.connectionDelay) {
            const newConnectionDelay = { ...value.connectionDelay };
            if (delay) {
              newConnectionDelay.android = parseInt(delay, 10);
            } else {
              delete newConnectionDelay.android;
            }
            onChange({ ...value, connectionDelay: newConnectionDelay });
          }
        }}
      />
      <Input
        id="session-config-connection-delay-ios"
        placeholder="iOS delay (ms)"
        disabled={disabled || !value.connectionDelay}
        value={value.connectionDelay?.ios ?? ""}
        type="number"
        min={0}
        step={1}
        onValueChange={delay => {
          if (value.connectionDelay) {
            const newConnectionDelay = { ...value.connectionDelay };
            if (delay) {
              newConnectionDelay.ios = parseInt(delay, 10);
            } else {
              delete newConnectionDelay.ios;
            }
            onChange({ ...value, connectionDelay: newConnectionDelay });
          }
        }}
      />
    </Field>
  );
}

export function TopLevelGroup({ value, onChange, disabled }: BaseConfigProps) {
  return (
    <SidebarGroup>
      <FieldGroup>
        <ConnectionTypeField
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <TopLevelTextOnlyField
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <UseWakeLockField
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <OriginField value={value} onChange={onChange} disabled={disabled} />
        <AuthorizationField
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <LiveKitUrlField
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <UserIdField value={value} onChange={onChange} disabled={disabled} />
        <ConnectionDelayField
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
        <CustomLlmExtraBodyField
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </FieldGroup>
    </SidebarGroup>
  );
}
