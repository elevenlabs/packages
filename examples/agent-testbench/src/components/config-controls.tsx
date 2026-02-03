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
              checked={value.textOnly ?? false}
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
      <CollapsibleFieldGroup title="Overrides (Agent)">
        <Field>
          <FieldLabel htmlFor="session-config-overrides-agent-prompt">
            Prompt
          </FieldLabel>
          <Input
            id="session-config-overrides-agent-prompt"
            disabled={disabled}
            value={value.overrides?.agent?.prompt?.prompt ?? ""}
            onChange={e =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  agent: {
                    ...value.overrides?.agent,
                    prompt: e.target.value
                      ? {
                          prompt: e.target.value,
                        }
                      : undefined,
                  },
                },
              })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="session-config-overrides-agent-first-message">
            First Message
          </FieldLabel>
          <Input
            id="session-config-overrides-agent-first-message"
            disabled={disabled}
            value={value.overrides?.agent?.firstMessage ?? ""}
            onChange={e =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  agent: {
                    ...value.overrides?.agent,
                    firstMessage: e.target.value,
                  },
                },
              })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="session-config-overrides-agent-language">
            Language
          </FieldLabel>
          <Input
            id="session-config-overrides-agent-language"
            disabled={disabled}
            value={value.overrides?.agent?.language ?? ""}
            onChange={e =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  agent: {
                    ...value.overrides?.agent,
                    language: e.target.value ? e.target.value : undefined,
                  },
                },
              })
            }
          />
        </Field>
      </CollapsibleFieldGroup>
      <CollapsibleFieldGroup title="Overrides (TTS)">
        <Field>
          <FieldLabel htmlFor="session-config-overrides-tts-voice-id">
            Voice ID
          </FieldLabel>
          <Input
            id="session-config-overrides-tts-voice-id"
            disabled={disabled}
            value={value.overrides?.tts?.voiceId ?? ""}
            onChange={e =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  tts: {
                    ...value.overrides?.tts,
                    voiceId: e.target.value ? e.target.value : undefined,
                  },
                },
              })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="session-config-overrides-tts-speed">
            Speed
          </FieldLabel>
          <Input
            id="session-config-overrides-tts-speed"
            disabled={disabled}
            type="number"
            min={0.7}
            max={1.2}
            step={0.01}
            value={value.overrides?.tts?.speed ?? ""}
            onChange={e =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  tts: {
                    ...value.overrides?.tts,
                    speed: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  },
                },
              })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="session-config-overrides-tts-stability">
            Stability
          </FieldLabel>
          <Input
            id="session-config-overrides-tts-stability"
            disabled={disabled}
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={value.overrides?.tts?.stability ?? ""}
            onChange={e =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  tts: {
                    ...value.overrides?.tts,
                    stability: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  },
                },
              })
            }
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="session-config-overrides-tts-similarity-boost">
            Similarity Boost
          </FieldLabel>
          <Input
            id="session-config-overrides-tts-similarity-boost"
            disabled={disabled}
            type="number"
            min={0}
            max={1}
            step={0.01}
            value={value.overrides?.tts?.similarityBoost ?? ""}
            onChange={e =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  tts: {
                    ...value.overrides?.tts,
                    similarityBoost: e.target.value
                      ? parseFloat(e.target.value)
                      : undefined,
                  },
                },
              })
            }
          />
        </Field>
      </CollapsibleFieldGroup>
      <CollapsibleFieldGroup title="Overrides (Conversation)">
        <Field>
          <div className="flex items-center space-x-2">
            <Switch
              id="session-config-overrides-conversation-text-only"
              disabled={disabled}
              checked={value.overrides?.conversation?.textOnly ?? false}
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
            value={value.overrides?.client?.source ?? ""}
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
            value={value.overrides?.client?.version ?? ""}
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
      </CollapsibleFieldGroup>
    </>
  );
}
