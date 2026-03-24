import type { SessionConfig, ConnectionType } from "./BaseConnection";
import { WebSocketConnection } from "./WebSocketConnection";
import { WebRTCConnection } from "./WebRTCConnection";

function determineConnectionType(config: SessionConfig): ConnectionType {
  const hasSignedUrl = "signedUrl" in config && config.signedUrl;

  // Reject invalid combination: signedUrl only supports websocket
  // Cast needed because TS narrows signedUrl configs to connectionType?: "websocket",
  // but this guard protects against invalid configs from plain JS callers.
  if (hasSignedUrl && (config.connectionType as ConnectionType) === "webrtc") {
    throw new Error(
      "signedUrl only supports websocket connections. Remove connectionType or set it to 'websocket'."
    );
  }

  // If connectionType is explicitly specified, use it
  if (config.connectionType) {
    return config.connectionType;
  }

  // If conversationToken is provided, use WebRTC
  if ("conversationToken" in config && config.conversationToken) {
    return "webrtc";
  }

  // If signedUrl is provided, use WebSocket (it only supports websocket)
  if (hasSignedUrl) {
    return "websocket";
  }

  // Infer from conversation mode: text-only uses websocket, voice uses webrtc
  return config.textOnly ? "websocket" : "webrtc";
}

export async function createConnection(
  config: SessionConfig & { connectionType: "websocket" }
): Promise<WebSocketConnection>;
export async function createConnection(
  config: SessionConfig & { connectionType: "webrtc" }
): Promise<WebRTCConnection>;
export async function createConnection(
  config: SessionConfig
): Promise<WebSocketConnection | WebRTCConnection>;
export async function createConnection(
  config: SessionConfig
): Promise<WebSocketConnection | WebRTCConnection> {
  const connectionType = determineConnectionType(config);

  switch (connectionType) {
    case "websocket":
      return WebSocketConnection.create(config);
    case "webrtc":
      return WebRTCConnection.create(config);
    default:
      throw new Error(`Unknown connection type: ${connectionType}`);
  }
}
