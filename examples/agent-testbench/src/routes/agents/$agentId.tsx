import {
  createFileRoute,
  useNavigate,
  ClientOnly,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { ArrowLeft } from "lucide-react";
import type { BaseSessionConfig, ConnectionType } from "@elevenlabs/client";

import { elevenlabs } from "@/lib/elevenlabs.server";
import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConversationProvider } from "@/components/conversation-provider";
import { AgentControls } from "@/components/agent-controls";
import { LogTable } from "@/components/log-table";
import { LogProvider } from "@/components/log-provider";
import { PermissionsLogger } from "@/components/permissions-logger";
import { ConfigControls } from "@/components/config-controls";

const AgentIdSchema = z.object({
  agentId: z.string(),
});

const getAgent = createServerFn()
  .inputValidator(AgentIdSchema)
  .handler(async ({ data }) => {
    const { agentId, name } = await elevenlabs.conversationalAi.agents.get(
      data.agentId
    );
    return { agentId, name };
  });

type LoaderData =
  | {
      agent: { agentId: string; name: string };
      error: null;
    }
  | {
      agent: null;
      error: string;
    };

export const Route = createFileRoute("/agents/$agentId")({
  component: RouteComponent,
  loader: async ({ params: { agentId } }): Promise<LoaderData> => {
    try {
      return { agent: await getAgent({ data: { agentId } }), error: null };
    } catch (error) {
      console.error("Failed to get agent", error);
      return { agent: null, error: "Failed to get agent" };
    }
  },
});

function RouteComponent() {
  const { agent, error } = Route.useLoaderData();
  const navigate = useNavigate();
  
  if (error) {
    return (
      <Page title="Error">
        <pre>{error}</pre>
      </Page>
    );
  }
  if (!agent) {
    return <Page title="Agent not found" />;
  }

  const [sessionConfig, setSessionConfig] = useState<
    BaseSessionConfig & { connectionType?: ConnectionType }
  >({});

  return (
    <LogProvider>
      <ConversationProvider>
        <Page title={agent.name}>
          <Button
            className="fixed top-2 left-2"
            variant="outline"
            onClick={() => navigate({ to: "/" })}
          >
            <ArrowLeft />
            Back
          </Button>
          <main className="flex flex-col gap-5">
            <Card className="w-md self-center">
              <CardContent className="flex flex-col gap-4">
                <ConfigControls
                  value={sessionConfig}
                  onChange={setSessionConfig}
                />
              </CardContent>
            </Card>
            <section className="flex flex-col grow min-h-screen">
              <AgentControls agentId={agent.agentId} options={sessionConfig} />
              <LogTable />
            </section>
          </main>
        </Page>
      </ConversationProvider>
      <ClientOnly>
        <PermissionsLogger />
      </ClientOnly>
    </LogProvider>
  );
}
