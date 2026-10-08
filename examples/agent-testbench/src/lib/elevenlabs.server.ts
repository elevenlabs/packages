import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { z } from "zod";

export type { ElevenLabs } from "@elevenlabs/elevenlabs-js";

export const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

const REALTIME_MODEL = "eleven_realtime_v1_mini";
const API_ORIGIN =
  process.env.ELEVENLABS_API_ORIGIN ?? "https://api.elevenlabs.io";

const ClientSecretResponseSchema = z.object({ value: z.string() });
const ErrorResponseSchema = z.object({
  detail: z.object({ message: z.string() }),
});

export async function mintRealtimeClientSecret(): Promise<string> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ELEVENLABS_API_KEY is not set. Copy .env.example to .env.local and set it."
    );
  }

  const response = await fetch(
    `${API_ORIGIN}/v1/convai/realtime/client_secrets`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        session: { type: "realtime", model: REALTIME_MODEL },
        expires_after: { anchor: "created_at", seconds: 600 },
      }),
    }
  );
  const body: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    const error = ErrorResponseSchema.safeParse(body);
    throw new Error(
      error.success
        ? error.data.detail.message
        : `Failed to mint a realtime client secret (HTTP ${response.status}).`
    );
  }
  return ClientSecretResponseSchema.parse(body).value;
}
