import {
  createFileRoute,
  ClientOnly,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { elevenlabs } from "@/lib/elevenlabs.server";
import { Page } from "@/components/page";
import { ConversationProvider } from "@/components/conversation-provider";
import { LogProvider } from "@/components/log-provider";
import { PermissionsLogger } from "@/components/permissions-logger";
import { AgentPage } from "@/components/agent-page";

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

  return (
    <LogProvider>
      <ConversationProvider>
        <AgentPage agent={agent} />
      </ConversationProvider>
      <ClientOnly>
        <PermissionsLogger />
      </ClientOnly>
    </LogProvider>
  );
}
