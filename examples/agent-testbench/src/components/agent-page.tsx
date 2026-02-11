import { ClientOnly } from "@tanstack/react-router";
import { ConfigSidebar } from "./config-sidebar/config-sidebar";
import { LogTable } from "./log-table";
import { AgentControls } from "./agent-controls";
import { Page } from "./page";
import {
  BaseSessionConfig,
  ConnectionType,
  PartialOptions,
} from "@elevenlabs/client";
import { useCallback, useState } from "react";
import { spyOnMethods } from "@/lib/utils";
import { useConversationControls } from "./conversation-provider";
import { useLogControls } from "./log-provider";

type AgentPageProps = {
  agent: { agentId: string; name: string };
};

const EVENT_METHOD_NAMES = [
  "onConnect",
  "onDisconnect",
  "onError",
  "onMessage",
  "onAudio",
  "onModeChange",
  "onStatusChange",
  "onCanSendFeedbackChange",
  "onUnhandledClientToolCall",
  "onVadScore",
  "onMCPToolCall",
  "onMCPConnectionStatus",
  "onAgentToolRequest",
  "onAgentToolResponse",
  "onConversationMetadata",
  "onAsrInitiationMetadata",
  "onInterruption",
  "onAgentChatResponsePart",
  "onAudioAlignment",
  "onDebug",
] satisfies (keyof PartialOptions)[];

export function AgentPage({ agent }: AgentPageProps) {
  const [sessionConfig, setSessionConfig] = useState<
    BaseSessionConfig & { connectionType?: ConnectionType }
  >({});
  const { start } = useConversationControls();
  const { appendLogEntry, clearLog } = useLogControls();

  const handleStart = useCallback(() => {
    const instrumentedOptions = spyOnMethods<PartialOptions>(
      {
        ...sessionConfig,
        agentId: agent.agentId,
        connectionType: sessionConfig?.connectionType ?? "webrtc",
      },
      EVENT_METHOD_NAMES,
      entry => appendLogEntry({ part: "conversation", ...entry })
    );
    clearLog();
    appendLogEntry({
      part: "conversation",
      method: "start",
      args: [instrumentedOptions],
      when: Date.now(),
    });
    start(instrumentedOptions);
  }, [sessionConfig, start, appendLogEntry]);

  return (
    <Page title={agent.name}>
      <ClientOnly>
        <section className="flex flex-col grow h-screen">
          <AgentControls onStart={handleStart} />
          <LogTable />
        </section>
        <ConfigSidebar
          value={sessionConfig}
          onChange={setSessionConfig}
          onStart={handleStart}
        />
      </ClientOnly>
    </Page>
  );
}
