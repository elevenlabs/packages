import { createFileRoute, Link } from "@tanstack/react-router";

import { createServerFn } from "@tanstack/react-start";

import { ElevenLabs, elevenlabs } from "@/lib/elevenlabs.server";
import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const getAgents = createServerFn().handler(async () => {
  const { agents } = await elevenlabs.conversationalAi.agents.list();
  return agents;
});

const getUser = createServerFn().handler(async () => {
  const { firstName, userId } = await elevenlabs.user.get();
  return { firstName, userId };
});

type LoaderData =
  | {
      agents: ElevenLabs.AgentSummaryResponseModel[];
      user: { firstName: string | undefined; userId: string } | null;
      error: null;
    }
  | {
      agents: [];
      user: null;
      error: string;
    };

export const Route = createFileRoute("/")({
  component: AgentsPage,
  loader: async (): Promise<LoaderData> => {
    try {
      return { agents: await getAgents(), user: await getUser(), error: null };
    } catch (error) {
      console.error("Failed to get agents", error);
      return { agents: [], user: null, error: "Failed to get agents" };
    }
  },
});

function AgentsPage() {
  const { agents, user, error } = Route.useLoaderData();
  return (
    <Page title={user ? `${user.firstName ?? user.userId}'s Agents` : "Agents"}>
      {error && <p>{error}</p>}
      <DropdownMenu>
        <DropdownMenuTrigger asChild className="self-center">
          <Button variant="outline">Select Agent</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {agents.map(agent => (
            <DropdownMenuItem key={agent.agentId} asChild>
              <Link to={`/agents/$agentId`} params={{ agentId: agent.agentId }}>
                {agent.name}
              </Link>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Page>
  );
}
