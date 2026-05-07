import type { AudioEventAlignment } from "@elevenlabs/types";

/**
 * Role in the conversation
 */
export type Role = "user" | "agent";

export type AudioAlignmentEvent = AudioEventAlignment;

/**
 * Current mode of the conversation
 */
export type Mode = "speaking" | "listening";

/**
 * Connection status of the conversation
 */
export type Status =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting";

/**
 * Reason for the disconnection
 */
export type DisconnectionDetails =
  | {
      reason: "error";
      message: string;
      context: Event;
      closeCode?: number;
      closeReason?: string;
    }
  | {
      reason: "agent";
      context?: CloseEvent;
      closeCode?: number;
      closeReason?: string;
    }
  | {
      reason: "user";
    };

export interface MessagePayload {
  message: string;
  event_id?: number;
  /**
   * @deprecated use {@link role} instead.
   */
  source: "user" | "ai";
  role: Role;
}
