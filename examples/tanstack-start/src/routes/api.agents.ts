import { createFileRoute } from '@tanstack/react-router'

import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

const client = new ElevenLabsClient({
    environment: "https://api.elevenlabs.io",
});

export const Route = createFileRoute('/api/agents')({
  server: {
    handlers: { 
      GET: () => Response.json(['Alice', 'Bob', 'Charlie']),
    },
  },
})
