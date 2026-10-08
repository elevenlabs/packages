import { createFileRoute, ClientOnly } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useCallback, useState } from "react";
import { ConversationProvider } from "@elevenlabs/react";

import { mintRealtimeClientSecret } from "@/lib/elevenlabs.server";
import { LocalStorage } from "@/lib/localStorage";
import { LogProvider } from "@/components/log-provider";
import { PermissionsLogger } from "@/components/permissions-logger";
import { RealtimePage } from "@/components/realtime-page";

const mintClientSecret = createServerFn({ method: "POST" }).handler(() =>
  mintRealtimeClientSecret()
);

export const Route = createFileRoute("/realtime")({
  component: RouteComponent,
});

function RouteComponent() {
  const [isMuted, setIsMuted] = useState(() => {
    return LocalStorage.getIsMuted() ?? false;
  });

  const handleMutedChange = useCallback((muted: boolean) => {
    setIsMuted(muted);
    LocalStorage.setIsMuted(muted);
  }, []);

  return (
    <ClientOnly>
      <LogProvider>
        <ConversationProvider
          isMuted={isMuted}
          onMutedChange={handleMutedChange}
        >
          <RealtimePage mintClientSecret={() => mintClientSecret()} />
        </ConversationProvider>
        <PermissionsLogger />
      </LogProvider>
    </ClientOnly>
  );
}
