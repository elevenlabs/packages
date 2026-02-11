import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Switch } from "@/components/ui/switch";

import { Input } from "@/components/ui/input";
import { useConversationStatus } from "@/components/conversation-provider";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar";
import { ChevronDown, ArrowRightToLine } from "lucide-react";
import { DynamicVariablesInput } from "@/components/config-sidebar/dynamic-variables-input";
import { BaseConfigProps } from "./types";
import { TopLevelGroup } from "./top-level-group";

function CollapsibleFieldGroup({
  children,
  title,
}: React.PropsWithChildren<{ title: string }>) {
  return (
    <Collapsible className="group/collapsible">
      <SidebarGroup>
        <SidebarGroupLabel asChild>
          <CollapsibleTrigger>
            {title}
            <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
          </CollapsibleTrigger>
        </SidebarGroupLabel>
        <CollapsibleContent>
          <SidebarGroupContent>
            <FieldGroup>{children}</FieldGroup>
          </SidebarGroupContent>
        </CollapsibleContent>
      </SidebarGroup>
    </Collapsible>
  );
}

function PromptField({ value, onChange, disabled }: BaseConfigProps) {
  return (
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
  );
}

function FirstMessageField({ value, onChange, disabled }: BaseConfigProps) {
  return (
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
  );
}

function LanguageField({ value, onChange, disabled }: BaseConfigProps) {
  return (
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
  );
}

function VoiceIdField({ value, onChange, disabled }: BaseConfigProps) {
  return (
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
  );
}

function SpeedField({ value, onChange, disabled }: BaseConfigProps) {
  return (
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
  );
}

function StabilityField({ value, onChange, disabled }: BaseConfigProps) {
  return (
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
  );
}

function SimilarityBoostField({ value, onChange, disabled }: BaseConfigProps) {
  return (
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
  );
}

function TextOnlyField({ value, onChange, disabled }: BaseConfigProps) {
  return (
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
  );
}

function SourceField({ value, onChange, disabled }: BaseConfigProps) {
  return (
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
  );
}

function VersionField({ value, onChange, disabled }: BaseConfigProps) {
  return (
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
  );
}

export function ConfigSidebar({
  value,
  onChange,
  onStart,
}: Omit<BaseConfigProps, "disabled"> & { onStart: () => void }) {
  const { status } = useConversationStatus();
  const { setOpen } = useSidebar();
  const disabled = status === "connecting" || status === "connected";

  return (
    <Sidebar side="right" collapsible="offcanvas">
      <SidebarHeader>
        <h2 className="text-lg font-bold text-center">Conversation Options</h2>
      </SidebarHeader>
      <SidebarContent>
        <TopLevelGroup value={value} onChange={onChange} disabled={disabled} />

        <CollapsibleFieldGroup title="Dynamic Variables">
          <DynamicVariablesInput
            values={value.dynamicVariables ?? {}}
            onChange={dynamicVariables =>
              onChange({ ...value, dynamicVariables })
            }
          />
        </CollapsibleFieldGroup>
        <CollapsibleFieldGroup title="Overrides (Agent)">
          <PromptField value={value} onChange={onChange} disabled={disabled} />
          <FirstMessageField
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
          <LanguageField
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        </CollapsibleFieldGroup>
        <CollapsibleFieldGroup title="Overrides (TTS)">
          <VoiceIdField value={value} onChange={onChange} disabled={disabled} />
          <SpeedField value={value} onChange={onChange} disabled={disabled} />
          <StabilityField
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
          <SimilarityBoostField
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        </CollapsibleFieldGroup>
        <CollapsibleFieldGroup title="Overrides (Conversation)">
          <TextOnlyField
            value={value}
            onChange={onChange}
            disabled={disabled}
          />
        </CollapsibleFieldGroup>
        <CollapsibleFieldGroup title="Overrides (Client)">
          <SourceField value={value} onChange={onChange} disabled={disabled} />
          <VersionField value={value} onChange={onChange} disabled={disabled} />
        </CollapsibleFieldGroup>
      </SidebarContent>
      <SidebarFooter className="flex flex-row gap-2">
        <Button
          className="grow"
          variant="default"
          onClick={() => {
            setOpen(false);
            onStart();
          }}
        >
          Start Conversation
        </Button>
        <Button variant="ghost" onClick={() => onChange({})}>
          Reset
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
          <ArrowRightToLine />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
