// Re-export from the new connection architecture for backward compatibility
export {
  Language,
  DelayConfig,
  FormatConfig,
  DisconnectionDetails,
  OnDisconnectCallback,
  OnMessageCallback,
  SessionConfig,
  parseFormat,
} from "./BaseConnection.js";

import { createConnection } from "./ConnectionFactory.js";
export { createConnection };
export { WebSocketConnection } from "./WebSocketConnection.js";
export { WebRTCConnection } from "./WebRTCConnection.js";
export { BaseConnection } from "./BaseConnection.js";
import type { SessionConfig } from "./BaseConnection.js";

// Legacy Connection class that uses the factory
export class Connection {
  public static async create(config: SessionConfig) {
    return createConnection(config);
  }
}
