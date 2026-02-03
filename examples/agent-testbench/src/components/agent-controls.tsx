import type {
  BaseSessionConfig,
  ConnectionType,
  PartialOptions,
} from "@elevenlabs/client";
import { useCallback } from "react";

import { Button } from "@/components/ui/button";
import {
  useConversationControls,
  useConversationStatus,
} from "@/components/conversation-provider";
import { Spinner } from "@/components/ui/spinner";
import { useLogControls, useLogEntries } from "./log-provider";
import { spyOnMethods } from "@/lib/utils";
import { ChatControls } from "./chat-controls";

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

function ClearEventsButton() {
  const events = useLogEntries();
  const { clearLog } = useLogControls();
  return (
    <Button
      disabled={events.length === 0}
      className="ml-auto"
      variant="outline"
      onClick={clearLog}
    >
      Clear Events
    </Button>
  );
}

export function AgentControls({
  agentId,
  options,
}: {
  agentId: string;
  options: BaseSessionConfig & { connectionType?: ConnectionType };
}) {
  const status = useConversationStatus();
  const { start, end } = useConversationControls();
  const { appendLogEntry, clearLog } = useLogControls();

  const handleStart = useCallback(() => {
    const instrumentedOptions = spyOnMethods<PartialOptions>(
      {
        ...options,
        agentId,
        connectionType: options?.connectionType ?? "webrtc",
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
  }, [options, start, appendLogEntry]);

  return (
    <>
      <section className="flex flex-row gap-2 my-4">
        <Button
          disabled={status.status !== "disconnected"}
          onClick={handleStart}
        >
          Start
          {status.status === "connecting" && <Spinner />}
        </Button>
        <Button disabled={status.status !== "connected"} onClick={() => end()}>
          End
        </Button>
        <ChatControls />
        <ClearEventsButton />
      </section>
    </>
  );
}
