export class ConversationError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ConversationError";
    this.code = code;
    this.details = details;
  }
}

/**
 * Error codes for different types of conversation errors
 */
export const ErrorCodes = {
  AUTHENTICATION_FAILED: "AUTHENTICATION_FAILED",
  CONNECTION_FAILED: "CONNECTION_FAILED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  AUDIO_DEVICE_ERROR: "AUDIO_DEVICE_ERROR",
  NETWORK_ERROR: "NETWORK_ERROR",
  INVALID_CONFIGURATION: "INVALID_CONFIGURATION",
  WEBRTC_ERROR: "WEBRTC_ERROR",
  AGENT_UNAVAILABLE: "AGENT_UNAVAILABLE",
} as const;
