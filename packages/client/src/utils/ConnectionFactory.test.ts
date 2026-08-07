import { describe, it, expect } from "vitest";
import { createConnection } from "./ConnectionFactory.js";
import type { SessionConfig } from "./BaseConnection.js";

describe("createConnection", () => {
  const onPremConfig = {
    conversationUrl: "wss://orchestrator.internal/convai",
  };

  it("rejects onPremConfig combined with webrtc", async () => {
    await expect(
      createConnection({
        onPremConfig,
        connectionType: "webrtc",
      } as unknown as SessionConfig)
    ).rejects.toThrow("only supports websocket");
  });

  it.each([
    { signedUrl: "wss://api.elevenlabs.io/v1/convai/conversation?token=x" },
    { conversationToken: "token" },
    { authorization: "bearer-token" },
  ])("rejects onPremConfig combined with %o", async extra => {
    await expect(
      createConnection({ onPremConfig, ...extra } as unknown as SessionConfig)
    ).rejects.toThrow("cannot be combined");
  });
});
