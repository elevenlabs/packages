import { describe, it, expect } from "vitest";
import { createConnection } from "./ConnectionFactory.js";
import type { SessionConfig } from "./BaseConnection.js";

describe("createConnection", () => {
  const orchestrator = {
    url: "wss://orchestrator.internal/convai",
  };

  it("rejects orchestrator combined with webrtc", async () => {
    await expect(
      createConnection({
        orchestrator,
        connectionType: "webrtc",
      } as unknown as SessionConfig)
    ).rejects.toThrow("only support websocket");
  });

  it.each([
    { signedUrl: "wss://api.elevenlabs.io/v1/convai/conversation?token=x" },
    { conversationToken: "token" },
    { authorization: "bearer-token" },
  ])("rejects orchestrator combined with %o", async extra => {
    await expect(
      createConnection({
        orchestrator,
        ...extra,
      } as unknown as SessionConfig)
    ).rejects.toThrow("cannot be combined");
  });
});
