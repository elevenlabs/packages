import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  ConnectionType,
  DisconnectionDetails,
  FormatConfig,
  IncomingSocketEvent,
  InputConfig,
  OutputConfig,
  SessionConfig,
} from "./unity.js";

type UnityTypeSurface = {
  connectionType: ConnectionType;
  disconnectionDetails: DisconnectionDetails;
  formatConfig: FormatConfig;
  incomingSocketEvent: IncomingSocketEvent;
  inputConfig: InputConfig;
  outputConfig: OutputConfig;
  sessionConfig: SessionConfig;
};

void (null as unknown as UnityTypeSurface);

describe("@elevenlabs/client/internal/unity", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("loads without browser globals", async () => {
    vi.stubGlobal("navigator", undefined);
    vi.stubGlobal("document", undefined);

    await expect(import("./unity.js")).resolves.toEqual(
      expect.objectContaining({
        WebSocketConnection: expect.any(Function),
        WebRTCConnection: expect.any(Function),
        createConnection: expect.any(Function),
        installIosAudioUnlockListener: expect.any(Function),
        WebAudioAdapter: expect.any(Function),
      })
    );
  });

  it("re-exports runtime values from side-effect-free leaf modules", async () => {
    const [
      unity,
      connectionFactory,
      webSocketConnection,
      webRTCConnection,
      uploadFile,
      audioUnlock,
      webAudioAdapter,
    ] = await Promise.all([
      import("./unity.js"),
      import("../utils/ConnectionFactory.js"),
      import("../utils/WebSocketConnection.js"),
      import("../utils/WebRTCConnection.js"),
      import("../utils/uploadFile.js"),
      import("../platform/web/audioUnlock.js"),
      import("../platform/web/webAudioAdapter.js"),
    ]);

    expect(unity.createConnection).toBe(connectionFactory.createConnection);
    expect(unity.WebSocketConnection).toBe(
      webSocketConnection.WebSocketConnection
    );
    expect(unity.WebRTCConnection).toBe(webRTCConnection.WebRTCConnection);
    expect(unity.uploadFile).toBe(uploadFile.uploadFile);
    expect(unity.installIosAudioUnlockListener).toBe(
      audioUnlock.installIosAudioUnlockListener
    );
    expect(unity.WebAudioAdapter).toBe(webAudioAdapter.WebAudioAdapter);
  });
});
