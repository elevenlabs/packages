import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

export type { ElevenLabs } from "@elevenlabs/elevenlabs-js";

export const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});
