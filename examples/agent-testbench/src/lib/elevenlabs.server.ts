import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export type { ElevenLabs } from "@elevenlabs/elevenlabs-js";

export const elevenlabs = new ElevenLabsClient({
  environment: "https://api.elevenlabs.io",
  apiKey: process.env.ELEVENLABS_API_KEY,
});
