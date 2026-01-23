import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import { z } from 'zod'
import { ArrowLeft } from 'lucide-react'
import type { ConnectionType, PartialOptions } from '@elevenlabs/client'

import { elevenlabs } from '@/lib/elevenlabs.server'
import { Page } from '@/components/page'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { ConversationProvider } from '@/components/conversation-provider'
import { AgentControls } from '@/components/agent-controls'
import { ConnectionTypeControls } from '@/components/connection-type-controls'
import { EventTable } from '@/components/event-table'
import { MediaDevicesControls } from '@/components/media-devices-controls'

const AgentIdSchema = z.object({
  agentId: z.string()
})

const getAgent = createServerFn().inputValidator(AgentIdSchema).handler(async ({ data }) => {
  const { agentId, name } = await elevenlabs.conversationalAi.agents.get(data.agentId);
  return { agentId, name };
});

type LoaderData = {
  agent: { agentId: string, name: string }
  error: null
} | {
  agent: null
  error: string
}

export const Route = createFileRoute('/agents/$agentId')({
  component: RouteComponent,
  loader: async ({ params: { agentId } }): Promise<LoaderData> => {
    try {
      return { agent: await getAgent({ data: { agentId } }), error: null }
    } catch (error) {
      console.error('Failed to get agent', error);
      return { agent: null, error: 'Failed to get agent' }
    }
  },
})

function RouteComponent() {
  const { agent, error } = Route.useLoaderData()
  const navigate = useNavigate()

  if (error) {
    return (
      <Page title="Error">
        <pre>{error}</pre>
      </Page>
    )
  }
  if (!agent) {
    return (
      <Page title="Agent not found" />
    )
  }

  const [connectionType, setConnectionType] = useState<ConnectionType>("webrtc");

  return (
    <Page title={agent.name}>
      <ConversationProvider>
        <Button className='fixed top-2 left-2' variant="outline" onClick={() => navigate({ to: "/agents" })}>
          <ArrowLeft />
          Back
        </Button>
        <Card>
          <CardContent className='flex flex-row gap-2'>
            <ConnectionTypeControls value={connectionType} onChange={setConnectionType} />
            <MediaDevicesControls />
          </CardContent>
        </Card>
        <AgentControls agentId={agent.agentId} options={{ connectionType, agentId: agent.agentId }} />
        <EventTable />
      </ConversationProvider>
    </Page>
  )
}
