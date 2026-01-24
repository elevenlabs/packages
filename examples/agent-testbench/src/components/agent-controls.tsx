import type { PartialOptions } from "@elevenlabs/client";

import { Button } from "@/components/ui/button";
import { useConversationControls, useConversationStatus } from "@/components/conversation-provider";
import { useLogControls, useLogEntries } from "./log-provider";
import { useCallback } from "react";
import { spyOnMethods } from "@/lib/utils";

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
    "onDebug"
] satisfies (keyof PartialOptions)[];

function ClearEventsButton() {
    const events = useLogEntries();
    const { clearLog } = useLogControls();
    return (
        <Button
            disabled={events.length === 0}
            className="ml-auto"
            variant="destructive"
            onClick={clearLog}
        >
            Clear Events
        </Button>
    );
}

export function AgentControls({ agentId, options }: { agentId: string, options: PartialOptions | null }) {
    const status = useConversationStatus();
    const { start, end } = useConversationControls();

    const { appendLogEntry } = useLogControls();
    const handleStart = useCallback(() => {
        const instrumentedOptions = spyOnMethods<PartialOptions>(
            { agentId, connectionType: options?.connectionType ?? "webrtc" },
            EVENT_METHOD_NAMES,
            (entry) => appendLogEntry({ part: "conversation", ...entry }),
        );
        start(instrumentedOptions);
    }, [start, appendLogEntry]);
    
    return (
        <section className="flex flex-row gap-2 my-4">
            <Button disabled={status.status !== "disconnected"} onClick={handleStart}>Start</Button>
            <Button disabled={status.status !== "connected"} onClick={() => end()}>End</Button>
            <ClearEventsButton />
        </section>
    )
}