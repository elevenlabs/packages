import type { BaseSessionConfig, ConnectionType } from "@elevenlabs/client";

import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useConversationStatus } from "@/components/conversation-provider";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDownIcon } from "lucide-react";
import { DynamicVariablesInput } from "@/components/dynamic-variables-input";
import { JsonInput } from "./json-input";

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
      <FieldGroup className="flex flex-row gap-2 items-center">
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
          <div className="flex items-center justify-end space-x-2">
            <FieldLabel htmlFor="session-config-text-only">
              Text Only
            </FieldLabel>
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
          </div>
          <div className="flex items-center justify-end space-x-2">
            <FieldLabel htmlFor="session-config-use-wake-lock">
              Use Wake Lock
            </FieldLabel>
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
          </div>
        </Field>
      </FieldGroup>
      <FieldGroup>
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
        <Field>
          <FieldLabel htmlFor="session-config-livekit-url">
            LiveKit URL
          </FieldLabel>
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
      </FieldGroup>
      <CollapsibleFieldGroup title="Dynamic Variables">
        <DynamicVariablesInput
          values={value.dynamicVariables ?? {}}
          onChange={dynamicVariables =>
            onChange({ ...value, dynamicVariables })
          }
        />
      </CollapsibleFieldGroup>
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
            onValueChange={prompt =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  agent: {
                    ...value.overrides?.agent,
                    prompt: prompt
                      ? {
                          prompt: prompt ? prompt : undefined,
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
            onValueChange={firstMessage =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  agent: {
                    ...value.overrides?.agent,
                    firstMessage: firstMessage ? firstMessage : undefined,
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
            onValueChange={language =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  agent: {
                    ...value.overrides?.agent,
                    language: language ? language : undefined,
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
            onValueChange={voiceId =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  tts: {
                    ...value.overrides?.tts,
                    voiceId: voiceId ? voiceId : undefined,
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
            onValueChange={speed =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  tts: {
                    ...value.overrides?.tts,
                    speed: speed ? parseFloat(speed) : undefined,
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
            onValueChange={stability =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  tts: {
                    ...value.overrides?.tts,
                    stability: stability ? parseFloat(stability) : undefined,
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
            onValueChange={similarityBoost =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  tts: {
                    ...value.overrides?.tts,
                    similarityBoost: similarityBoost
                      ? parseFloat(similarityBoost)
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
            onValueChange={source =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  client: {
                    ...value.overrides?.client,
                    source: source ? source : undefined,
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
            onValueChange={version =>
              onChange({
                ...value,
                overrides: {
                  ...value.overrides,
                  client: {
                    ...value.overrides?.client,
                    version: version ? version : undefined,
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
