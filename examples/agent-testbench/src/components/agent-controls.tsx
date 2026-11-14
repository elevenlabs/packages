import { useCallback } from "react";
import { EllipsisVertical } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import {
  useConversationControls,
  useConversationStatus,
} from "@elevenlabs/react";
import { Spinner } from "@/components/ui/spinner";

import { useLogControls, useLogEntries } from "./log-provider";
import { ChatControls } from "./chat-controls";
import { MuteSwitch } from "./mute-switch";
import { useSidebar } from "./ui/sidebar";

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
      Clear log
    </Button>
  );
}

export function AgentControls({ onStart }: { onStart: () => void }) {
  const status = useConversationStatus();
  const { endSession } = useConversationControls();
  const { setOpen: setSidebarOpen } = useSidebar();

  const handleConfigure = useCallback(() => {
    setSidebarOpen(true);
  }, [setSidebarOpen]);

  // "error" means the last session failed to start — a new one can be started.
  const isIdle = status.status === "disconnected" || status.status === "error";

  return (
    <>
      <section className="flex flex-row gap-2 my-4">
        <ButtonGroup>
          <Button disabled={!isIdle} onClick={onStart}>
            Start
          </Button>
          <Button
            title="Configure before starting"
            disabled={!isIdle}
            onClick={handleConfigure}
          >
            {status.status === "connecting" ? (
              <Spinner />
            ) : (
              <EllipsisVertical />
            )}
          </Button>
        </ButtonGroup>
        <Button
          disabled={status.status !== "connected"}
          onClick={() => endSession()}
        >
          End
        </Button>
        <ChatControls />
        <MuteSwitch disabled={status.status !== "connected"} />
        <ClearEventsButton />
      </section>
    </>
  );
}
