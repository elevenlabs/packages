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
import { useConversationStatus } from "@/components/conversation-provider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "./ui/button";

export type ConfigControlsProps = {
  value: BaseSessionConfig & { connectionType?: ConnectionType };
  onChange: (
    connectionType: BaseSessionConfig & { connectionType?: ConnectionType }
  ) => void;
};

function CollapsibleFieldGroup({
  children,
  title,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <Collapsible className="data-[state=open]:border rounded-md -mx-3">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="group w-full">
          {title}
          <ChevronDownIcon className="ml-auto group-data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <FieldGroup className="p-3">{children}</FieldGroup>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function ConfigControls({ value, onChange }: ConfigControlsProps) {
  const { status } = useConversationStatus();

  const disabled = status === "connecting" || status === "connected";

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
              <TabsTrigger disabled={disabled} value="webrtc">
                WebRTC
              </TabsTrigger>
              <TabsTrigger disabled={disabled} value="websocket">
                WebSocket
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </Field>
        <Field>
          <div className="flex items-center space-x-2">
            <Switch
              id="session-config-text-only"
              disabled={disabled}
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
      <FieldSeparator />
      <CollapsibleFieldGroup title="Overrides (Conversation)">
        <Field>
          <div className="flex items-center space-x-2">
            <Switch
              id="session-config-overrides-conversation-text-only"
              disabled={disabled}
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
      </CollapsibleFieldGroup>
      <CollapsibleFieldGroup title="Overrides (Client)">
        <Field>
          <FieldLabel htmlFor="session-config-overrides-client-source">
            Source
          </FieldLabel>
          <Input
            id="session-config-overrides-client-source"
            disabled={disabled}
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
            disabled={disabled}
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
      </CollapsibleFieldGroup>
    </>
  );
}
