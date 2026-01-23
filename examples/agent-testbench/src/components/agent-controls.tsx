import type { PartialOptions } from "@elevenlabs/client";

import { Button } from "@/components/ui/button";
import { useConversationControls, useConversationEvents, useConversationStatus } from "@/components/conversation-provider";

function ClearEventsButton() {
    const { events, clearEvents } = useConversationEvents();
    return (
        <Button
            disabled={events.length === 0}
            className="ml-auto"
            variant="destructive"
            onClick={() => clearEvents()}
        >
            Clear Events
        </Button>
    );
}

export function AgentControls({ agentId, options }: { agentId: string, options: PartialOptions | null }) {
    const status = useConversationStatus();
    const { start, end } = useConversationControls();
    return (
        <section className="flex flex-row gap-2 my-4">
            <Button disabled={status.status !== "disconnected"} onClick={() => start({ agentId, connectionType: options?.connectionType ?? "webrtc" })}>Start</Button>
            <Button disabled={status.status !== "connected"} onClick={() => end()}>End</Button>
            <ClearEventsButton />
        </section>
    )
}