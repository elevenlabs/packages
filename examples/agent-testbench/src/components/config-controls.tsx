import type { BaseSessionConfig, ConnectionType } from "@elevenlabs/client";

import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

export type ConfigControls = {
  value: BaseSessionConfig & { connectionType?: ConnectionType };
  onChange: (
    connectionType: BaseSessionConfig & { connectionType?: ConnectionType }
  ) => void;
};

export function ConfigControls({ value, onChange }: ConfigControls) {
  return (
    <>
      <FieldGroup>
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
              <TabsTrigger value="webrtc">WebRTC</TabsTrigger>
              <TabsTrigger value="websocket">WebSocket</TabsTrigger>
            </TabsList>
          </Tabs>
        </Field>
      </FieldGroup>
      <FieldSeparator className="my-2">Session Config</FieldSeparator>
      <FieldGroup>
        <Field>
          <div className="flex items-center space-x-2">
            <Switch
              id="session-config-text-only"
              checked={value.textOnly}
              onCheckedChange={checked =>
                onChange({
                  ...value,
                  textOnly: checked,
                })
              }
            />
            <FieldLabel htmlFor="session-config-text-only">
              Text Only
            </FieldLabel>
          </div>
        </Field>
      </FieldGroup>
      <FieldSeparator className="my-2">Overrides (Conversation)</FieldSeparator>
      <FieldGroup>
        <Field>
          <div className="flex items-center space-x-2">
            <Switch
              id="session-config-overrides-conversation-text-only"
              checked={value.overrides?.conversation?.textOnly}
              onCheckedChange={checked =>
                onChange({
                  ...value,
                  overrides: {
                    ...value.overrides,
                    conversation: { textOnly: checked },
                  },
                })
              }
            />
            <FieldLabel htmlFor="session-config-overrides-conversation-text-only">
              Text Only
            </FieldLabel>
          </div>
        </Field>
      </FieldGroup>
      <FieldSeparator className="my-2">Overrides (Client)</FieldSeparator>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="session-config-overrides-client-source">
            Source
          </FieldLabel>
          <Input
            id="session-config-overrides-client-source"
            value={value.overrides?.client?.source}
            onChange={e =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  client: {
                    ...value.overrides?.client,
                    source: e.target.value,
                  },
                },
              })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="session-config-overrides-client-version">
            Version
          </FieldLabel>
          <Input
            id="session-config-overrides-client-version"
            value={value.overrides?.client?.version}
            onChange={e =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  client: {
                    ...value.overrides?.client,
                    version: e.target.value,
                  },
                },
              })
            }
          />
        </Field>
        {/* 
          overrides?: {
            agent?: {
                prompt?: {
                    prompt?: string;
                };
                firstMessage?: string;
                language?: Language;
            };
            tts?: {
                voiceId?: string;
                speed?: number;
                stability?: number;
                similarityBoost?: number;
            };
            conversation?: {
                textOnly?: boolean;
            };
            client?: {
                source?: string;
                version?: string;
            };
          };
        */}
      </FieldGroup>
    </>
  );
}
