import { describe, it, expect } from "vitest";
import { createConnection } from "./ConnectionFactory.js";
import type { SessionConfig } from "./BaseConnection.js";

describe("createConnection", () => {
  const orchestratorConfig = {
    url: "wss://orchestrator.internal/convai",
  };

  it("rejects orchestratorConfig combined with webrtc", async () => {
    await expect(
      createConnection({
        orchestratorConfig,
        connectionType: "webrtc",
      } as unknown as SessionConfig)
    ).rejects.toThrow("only supports websocket");
  });

  it.each([
    { signedUrl: "wss://api.elevenlabs.io/v1/convai/conversation?token=x" },
    { conversationToken: "token" },
    { authorization: "bearer-token" },
  ])("rejects orchestratorConfig combined with %o", async extra => {
    await expect(
      createConnection({
        orchestratorConfig,
        ...extra,
      } as unknown as SessionConfig)
    ).rejects.toThrow("cannot be combined");
  });
});
