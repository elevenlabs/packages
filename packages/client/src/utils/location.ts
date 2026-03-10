export type Location = "us" | "global" | "eu-residency" | "in-residency";

export function parseLocation(location: string = "us"): Location {
  switch (location) {
    case "eu-residency":
    case "in-residency":
    case "us":
    case "global":
      return location;
    default:
      console.warn(
        `[ConversationalAI] Invalid server-location: ${location}. Defaulting to "us"`
      );
      return "us";
  }
}

export function getOriginForLocation(location: Location): string {
  const originMap: Record<Location, string> = {
    us: "wss://api.elevenlabs.io",
    "eu-residency": "wss://api.eu.residency.elevenlabs.io",
    "in-residency": "wss://api.in.residency.elevenlabs.io",
    global: "wss://api.elevenlabs.io",
  };

  return originMap[location];
}

export function getLivekitUrlForLocation(location: Location): string {
  const livekitUrlMap: Record<Location, string> = {
    us: "wss://livekit.rtc.elevenlabs.io",
    "eu-residency": "wss://livekit.rtc.eu.residency.elevenlabs.io",
    "in-residency": "wss://livekit.rtc.in.residency.elevenlabs.io",
    global: "wss://livekit.rtc.elevenlabs.io",
  };

  return livekitUrlMap[location];
}
