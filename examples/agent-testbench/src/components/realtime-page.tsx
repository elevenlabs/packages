import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { ArrowRightToLine } from "lucide-react";
import type {
  PartialOptions,
  RealtimeSessionOptions,
} from "@elevenlabs/client";
import {
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";

import { spyOnMethods } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import { AgentControls } from "./agent-controls";
import { EVENT_METHOD_NAMES } from "./agent-page";
import { LogTable } from "./log-table";
import { useLogControls } from "./log-provider";
import { Page } from "./page";

type RealtimeConfig = {
  textOnly?: boolean;
  origin?: string;
  realtime: RealtimeSessionOptions;
};

const DEFAULT_CONFIG: RealtimeConfig = {
  realtime: {
    instructions:
      "You are a helpful, friendly voice assistant. Keep your replies concise and conversational.",
    voice: "brian",
  },
};

type RealtimeConfigProps = {
  value: RealtimeConfig;
  onChange: (value: RealtimeConfig) => void;
  disabled: boolean;
};

function TextField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  disabled: boolean;
}) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        disabled={disabled}
        value={value ?? ""}
        onValueChange={text => onChange(text ? text : undefined)}
      />
    </Field>
  );
}

function RealtimeConfigSidebar({
  value,
  onChange,
  onStart,
}: Omit<RealtimeConfigProps, "disabled"> & { onStart: () => void }) {
  const { status } = useConversationStatus();
  const { setOpen } = useSidebar();
  const disabled = status === "connecting" || status === "connected";

  return (
    <Sidebar side="right" collapsible="offcanvas">
      <SidebarHeader>
        <h2 className="text-lg font-bold text-center">Realtime Options</h2>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <FieldGroup>
            <Field className="flex flex-row items-center space-x-2">
              <Switch
                id="realtime-config-text-only"
                disabled={disabled}
                checked={value.textOnly ?? false}
                onCheckedChange={textOnly => onChange({ ...value, textOnly })}
              />
              <FieldLabel htmlFor="realtime-config-text-only">
                Text Only
              </FieldLabel>
            </Field>
            <TextField
              id="realtime-config-origin"
              label="Origin"
              disabled={disabled}
              value={value.origin}
              onChange={origin => onChange({ ...value, origin })}
            />
            <TextField
              id="realtime-config-instructions"
              label="Instructions"
              disabled={disabled}
              value={value.realtime.instructions}
              onChange={instructions =>
                onChange({
                  ...value,
                  realtime: { ...value.realtime, instructions },
                })
              }
            />
            <TextField
              id="realtime-config-voice"
              label="Voice"
              disabled={disabled}
              value={value.realtime.voice}
              onChange={voice =>
                onChange({ ...value, realtime: { ...value.realtime, voice } })
              }
            />
          </FieldGroup>
        </SidebarGroup>
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
        <Button variant="ghost" onClick={() => onChange(DEFAULT_CONFIG)}>
          Reset
        </Button>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
          <ArrowRightToLine />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

type RealtimePageProps = {
  mintClientSecret: () => Promise<string>;
};

export function RealtimePage({ mintClientSecret }: RealtimePageProps) {
  const [config, setConfig] = useState<RealtimeConfig>(DEFAULT_CONFIG);
  const { startSession } = useConversationControls();
  const { appendLogEntry, clearLog } = useLogControls();
  const { setOpen: setSidebarOpen } = useSidebar();

  const openSidebar = useEffectEvent(() => setSidebarOpen(true));
  useEffect(() => openSidebar(), []);

  const handleStart = useCallback(async () => {
    clearLog();
    let clientSecret: string;
    try {
      clientSecret = await mintClientSecret();
    } catch (error) {
      appendLogEntry({
        part: "testbench",
        method: "mintClientSecret",
        args: [error instanceof Error ? error.message : String(error)],
        when: Date.now(),
      });
      return;
    }
    const instrumentedOptions = spyOnMethods<PartialOptions>(
      { ...config, connectionType: "websocket-realtime", clientSecret },
      EVENT_METHOD_NAMES,
      entry => appendLogEntry({ part: "conversation", ...entry })
    );
    appendLogEntry({
      part: "conversation",
      method: "startSession",
      args: [instrumentedOptions],
      when: Date.now(),
    });
    startSession(instrumentedOptions);
  }, [config, mintClientSecret, startSession, appendLogEntry, clearLog]);

  return (
    <Page title="Realtime">
      <section className="flex flex-col grow h-screen">
        <AgentControls onStart={handleStart} />
        <LogTable />
      </section>
      <RealtimeConfigSidebar
        value={config}
        onChange={setConfig}
        onStart={handleStart}
      />
    </Page>
  );
}
