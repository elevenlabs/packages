// Comprehensive tests for the errors module
import { ConversationError, ErrorCodes } from "./errors";

describe("ConversationError", () => {
  describe("Error Creation", () => {
    it("should create error with required parameters", () => {
      const error = new ConversationError(
        ErrorCodes.AUTHENTICATION_FAILED,
        "Authentication failed"
      );

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(ConversationError);
      expect(error.name).toBe("ConversationError");
      expect(error.code).toBe(ErrorCodes.AUTHENTICATION_FAILED);
      expect(error.message).toBe("Authentication failed");
      expect(error.details).toBeUndefined();
    });

    it("should create error with details", () => {
      const details = {
        context: "test-context",
        timestamp: Date.now(),
        userId: "user-123",
      };

      const error = new ConversationError(
        ErrorCodes.CONNECTION_FAILED,
        "Connection failed",
        details
      );

      expect(error.code).toBe(ErrorCodes.CONNECTION_FAILED);
      expect(error.message).toBe("Connection failed");
      expect(error.details).toEqual(details);
    });

    it("should create error with empty details object", () => {
      const error = new ConversationError(
        ErrorCodes.NETWORK_ERROR,
        "Network error",
        {}
      );

      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.message).toBe("Network error");
      expect(error.details).toEqual({});
    });

    it("should create error with complex details", () => {
      const details = {
        originalError: {
          name: "TypeError",
          message: "Cannot read property of undefined",
        },
        stackTrace: "Error at line 123",
        networkResponse: {
          status: 500,
          statusText: "Internal Server Error",
          headers: { "content-type": "application/json" },
        },
        userAgent: "Mozilla/5.0...",
        timestamp: new Date().toISOString(),
      };

      const error = new ConversationError(
        ErrorCodes.WEBRTC_ERROR,
        "WebRTC connection failed",
        details
      );

      expect(error.code).toBe(ErrorCodes.WEBRTC_ERROR);
      expect(error.message).toBe("WebRTC connection failed");
      expect(error.details).toEqual(details);
    });
  });

  describe("Error Properties", () => {
    it("should have correct name property", () => {
      const error = new ConversationError(
        ErrorCodes.AUDIO_DEVICE_ERROR,
        "Audio device error"
      );

      expect(error.name).toBe("ConversationError");
    });

    it("should have correct code property", () => {
      const error = new ConversationError(
        ErrorCodes.PERMISSION_DENIED,
        "Permission denied"
      );

      expect(error.code).toBe(ErrorCodes.PERMISSION_DENIED);
    });

    it("should have correct message property", () => {
      const message = "This is a test error message";
      const error = new ConversationError(
        ErrorCodes.INVALID_CONFIGURATION,
        message
      );

      expect(error.message).toBe(message);
    });

    it("should have correct details property", () => {
      const details = { reason: "test-reason", data: [1, 2, 3] };
      const error = new ConversationError(
        ErrorCodes.AGENT_UNAVAILABLE,
        "Agent unavailable",
        details
      );

      expect(error.details).toEqual(details);
    });

    it("should have undefined details when not provided", () => {
      const error = new ConversationError(
        ErrorCodes.AUTHENTICATION_FAILED,
        "Authentication failed"
      );

      expect(error.details).toBeUndefined();
    });
  });

  describe("Error Inheritance", () => {
    it("should inherit from Error class", () => {
      const error = new ConversationError(
        ErrorCodes.CONNECTION_FAILED,
        "Connection failed"
      );

      expect(error instanceof Error).toBe(true);
      expect(error instanceof ConversationError).toBe(true);
    });

    it("should have proper prototype chain", () => {
      const error = new ConversationError(
        ErrorCodes.NETWORK_ERROR,
        "Network error"
      );

      expect(Object.getPrototypeOf(error)).toBe(ConversationError.prototype);
      expect(Object.getPrototypeOf(ConversationError.prototype)).toBe(
        Error.prototype
      );
    });

    it("should work with instanceof checks", () => {
      const error = new ConversationError(
        ErrorCodes.AUDIO_DEVICE_ERROR,
        "Audio device error"
      );

      expect(error instanceof ConversationError).toBe(true);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe("Error Serialization", () => {
    it("should serialize to JSON correctly", () => {
      const details = { context: "test", value: 42 };
      const error = new ConversationError(
        ErrorCodes.WEBRTC_ERROR,
        "WebRTC error",
        details
      );

      const serialized = JSON.parse(JSON.stringify(error));

      expect(serialized.name).toBe("ConversationError");
      expect(serialized.code).toBe(ErrorCodes.WEBRTC_ERROR);
      expect(serialized.message).toBe("WebRTC error");
      expect(serialized.details).toEqual(details);
    });

    it("should serialize without details", () => {
      const error = new ConversationError(
        ErrorCodes.PERMISSION_DENIED,
        "Permission denied"
      );

      const serialized = JSON.parse(JSON.stringify(error));

      expect(serialized.name).toBe("ConversationError");
      expect(serialized.code).toBe(ErrorCodes.PERMISSION_DENIED);
      expect(serialized.message).toBe("Permission denied");
      expect(serialized.details).toBeUndefined();
    });

    it("should handle complex nested details in serialization", () => {
      const details = {
        nested: {
          level1: {
            level2: {
              value: "deep value",
              array: [1, 2, 3],
            },
          },
        },
        date: new Date().toISOString(),
      };

      const error = new ConversationError(
        ErrorCodes.INVALID_CONFIGURATION,
        "Invalid configuration",
        details
      );

      const serialized = JSON.parse(JSON.stringify(error));

      expect(serialized.details).toEqual(details);
    });
  });

  describe("Error String Representation", () => {
    it("should have proper toString representation", () => {
      const error = new ConversationError(
        ErrorCodes.AUTHENTICATION_FAILED,
        "Authentication failed"
      );

      const stringRep = error.toString();

      expect(stringRep).toBe("ConversationError: Authentication failed");
    });

    it("should work with console.log and string coercion", () => {
      const error = new ConversationError(
        ErrorCodes.CONNECTION_FAILED,
        "Connection failed"
      );

      expect(String(error)).toBe("ConversationError: Connection failed");
    });
  });

  describe("Error Comparison", () => {
    it("should compare error codes correctly", () => {
      const error1 = new ConversationError(
        ErrorCodes.AUTHENTICATION_FAILED,
        "Auth failed 1"
      );
      const error2 = new ConversationError(
        ErrorCodes.AUTHENTICATION_FAILED,
        "Auth failed 2"
      );
      const error3 = new ConversationError(
        ErrorCodes.CONNECTION_FAILED,
        "Connection failed"
      );

      expect(error1.code).toBe(error2.code);
      expect(error1.code).not.toBe(error3.code);
    });

    it("should handle equality checks", () => {
      const error1 = new ConversationError(
        ErrorCodes.NETWORK_ERROR,
        "Network error"
      );
      const error2 = new ConversationError(
        ErrorCodes.NETWORK_ERROR,
        "Network error"
      );

      // Different instances should not be equal
      expect(error1).not.toBe(error2);
      expect(error1 === error2).toBe(false);

      // But properties should be equal
      expect(error1.code).toBe(error2.code);
      expect(error1.message).toBe(error2.message);
    });
  });
});

describe("ErrorCodes", () => {
  describe("Error Code Constants", () => {
    it("should have AUTHENTICATION_FAILED error code", () => {
      expect(ErrorCodes.AUTHENTICATION_FAILED).toBe("AUTHENTICATION_FAILED");
    });

    it("should have CONNECTION_FAILED error code", () => {
      expect(ErrorCodes.CONNECTION_FAILED).toBe("CONNECTION_FAILED");
    });

    it("should have PERMISSION_DENIED error code", () => {
      expect(ErrorCodes.PERMISSION_DENIED).toBe("PERMISSION_DENIED");
    });

    it("should have AUDIO_DEVICE_ERROR error code", () => {
      expect(ErrorCodes.AUDIO_DEVICE_ERROR).toBe("AUDIO_DEVICE_ERROR");
    });

    it("should have NETWORK_ERROR error code", () => {
      expect(ErrorCodes.NETWORK_ERROR).toBe("NETWORK_ERROR");
    });

    it("should have INVALID_CONFIGURATION error code", () => {
      expect(ErrorCodes.INVALID_CONFIGURATION).toBe("INVALID_CONFIGURATION");
    });

    it("should have WEBRTC_ERROR error code", () => {
      expect(ErrorCodes.WEBRTC_ERROR).toBe("WEBRTC_ERROR");
    });

    it("should have AGENT_UNAVAILABLE error code", () => {
      expect(ErrorCodes.AGENT_UNAVAILABLE).toBe("AGENT_UNAVAILABLE");
    });
  });

  describe("Error Code Immutability", () => {
    it("should not allow modification of error codes", () => {
      const originalValue = ErrorCodes.AUTHENTICATION_FAILED;

      // Attempt to modify should not work (in strict mode)
      expect(() => {
        (ErrorCodes as Record<string, string>).AUTHENTICATION_FAILED =
          "MODIFIED";
      }).toThrow();

      expect(ErrorCodes.AUTHENTICATION_FAILED).toBe(originalValue);
    });

    it("should not allow adding new error codes", () => {
      const originalKeys = Object.keys(ErrorCodes);

      // Attempt to add new property should not work
      expect(() => {
        (ErrorCodes as Record<string, string>).NEW_ERROR_CODE =
          "NEW_ERROR_CODE";
      }).toThrow();

      expect(Object.keys(ErrorCodes)).toEqual(originalKeys);
    });
  });

  describe("Error Code Validation", () => {
    it("should have all required error codes", () => {
      const requiredCodes = [
        "AUTHENTICATION_FAILED",
        "CONNECTION_FAILED",
        "PERMISSION_DENIED",
        "AUDIO_DEVICE_ERROR",
        "NETWORK_ERROR",
        "INVALID_CONFIGURATION",
        "WEBRTC_ERROR",
        "AGENT_UNAVAILABLE",
      ];

      for (const code of requiredCodes) {
        expect(ErrorCodes).toHaveProperty(code);
        expect(ErrorCodes[code as keyof typeof ErrorCodes]).toBe(code);
      }
    });

    it("should not have unexpected error codes", () => {
      const expectedCodes = [
        "AUTHENTICATION_FAILED",
        "CONNECTION_FAILED",
        "PERMISSION_DENIED",
        "AUDIO_DEVICE_ERROR",
        "NETWORK_ERROR",
        "INVALID_CONFIGURATION",
        "WEBRTC_ERROR",
        "AGENT_UNAVAILABLE",
      ];

      const actualCodes = Object.keys(ErrorCodes);
      expect(actualCodes.sort()).toEqual(expectedCodes.sort());
    });

    it("should have consistent naming convention", () => {
      const codeNames = Object.keys(ErrorCodes);

      for (const codeName of codeNames) {
        // Should be UPPER_SNAKE_CASE
        expect(codeName).toMatch(/^[A-Z_]+$/);
        // Should not have double underscores
        expect(codeName).not.toMatch(/__/);
        // Should not start or end with underscore
        expect(codeName).not.toMatch(/^_|_$/);
      }
    });
  });

  describe("Error Code Usage", () => {
    it("should work with ConversationError", () => {
      const error = new ConversationError(
        ErrorCodes.AUTHENTICATION_FAILED,
        "Test message"
      );

      expect(error.code).toBe(ErrorCodes.AUTHENTICATION_FAILED);
      expect(error.code).toBe("AUTHENTICATION_FAILED");
    });

    it("should work in switch statements", () => {
      const testError = new ConversationError(
        ErrorCodes.NETWORK_ERROR,
        "Network error"
      );

      let result = "";
      switch (testError.code) {
        case ErrorCodes.AUTHENTICATION_FAILED:
          result = "auth";
          break;
        case ErrorCodes.NETWORK_ERROR:
          result = "network";
          break;
        default:
          result = "unknown";
      }

      expect(result).toBe("network");
    });

    it("should work in object lookups", () => {
      const errorHandlers = {
        [ErrorCodes.AUTHENTICATION_FAILED]: () => "handle auth",
        [ErrorCodes.CONNECTION_FAILED]: () => "handle connection",
        [ErrorCodes.NETWORK_ERROR]: () => "handle network",
      };

      expect(errorHandlers[ErrorCodes.AUTHENTICATION_FAILED]()).toBe(
        "handle auth"
      );
      expect(errorHandlers[ErrorCodes.CONNECTION_FAILED]()).toBe(
        "handle connection"
      );
      expect(errorHandlers[ErrorCodes.NETWORK_ERROR]()).toBe("handle network");
    });
  });
});

describe("Error Handling Scenarios", () => {
  describe("Real-world Error Scenarios", () => {
    it("should handle authentication failure scenario", () => {
      const error = new ConversationError(
        ErrorCodes.AUTHENTICATION_FAILED,
        "Invalid API key provided",
        {
          apiKey: "sk-***-***",
          endpoint:
            "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url",
          statusCode: 401,
          response: {
            error: "Invalid API key",
            code: "INVALID_API_KEY",
          },
        }
      );

      expect(error.code).toBe(ErrorCodes.AUTHENTICATION_FAILED);
      expect(error.message).toBe("Invalid API key provided");
      expect(error.details?.statusCode).toBe(401);
    });

    it("should handle connection failure scenario", () => {
      const error = new ConversationError(
        ErrorCodes.CONNECTION_FAILED,
        "Failed to connect to WebRTC server",
        {
          serverUrl: "wss://api.elevenlabs.io/v1/convai/conversation/ws",
          attempt: 3,
          maxRetries: 5,
          lastError: "Connection timeout",
          connectionState: "failed",
        }
      );

      expect(error.code).toBe(ErrorCodes.CONNECTION_FAILED);
      expect(error.message).toBe("Failed to connect to WebRTC server");
      expect(error.details?.attempt).toBe(3);
      expect(error.details?.maxRetries).toBe(5);
    });

    it("should handle permission denied scenario", () => {
      const error = new ConversationError(
        ErrorCodes.PERMISSION_DENIED,
        "Microphone permission denied by user",
        {
          platform: "ios",
          permissionStatus: "denied",
          canAskAgain: false,
          timestamp: new Date().toISOString(),
        }
      );

      expect(error.code).toBe(ErrorCodes.PERMISSION_DENIED);
      expect(error.message).toBe("Microphone permission denied by user");
      expect(error.details?.platform).toBe("ios");
    });

    it("should handle audio device error scenario", () => {
      const error = new ConversationError(
        ErrorCodes.AUDIO_DEVICE_ERROR,
        "No audio input devices available",
        {
          availableDevices: [],
          requestedDevice: "microphone",
          systemInfo: {
            os: "iOS",
            version: "17.0",
          },
        }
      );

      expect(error.code).toBe(ErrorCodes.AUDIO_DEVICE_ERROR);
      expect(error.message).toBe("No audio input devices available");
      expect(error.details?.availableDevices).toEqual([]);
    });

    it("should handle network error scenario", () => {
      const error = new ConversationError(
        ErrorCodes.NETWORK_ERROR,
        "Network request failed",
        {
          url: "https://api.elevenlabs.io/v1/convai/conversation/get_signed_url",
          method: "POST",
          statusCode: 0,
          timeout: 30000,
          networkType: "cellular",
          signal: "weak",
        }
      );

      expect(error.code).toBe(ErrorCodes.NETWORK_ERROR);
      expect(error.message).toBe("Network request failed");
      expect(error.details?.timeout).toBe(30000);
    });

    it("should handle WebRTC error scenario", () => {
      const error = new ConversationError(
        ErrorCodes.WEBRTC_ERROR,
        "ICE connection failed",
        {
          iceConnectionState: "failed",
          iceGatheringState: "complete",
          peerConnectionState: "failed",
          lastIceError: "Connection timeout",
          candidates: [],
        }
      );

      expect(error.code).toBe(ErrorCodes.WEBRTC_ERROR);
      expect(error.message).toBe("ICE connection failed");
      expect(error.details?.iceConnectionState).toBe("failed");
    });

    it("should handle agent unavailable scenario", () => {
      const error = new ConversationError(
        ErrorCodes.AGENT_UNAVAILABLE,
        "Agent is currently unavailable",
        {
          agentId: "agent-123",
          reason: "maintenance",
          estimatedRetryTime: 300, // 5 minutes
          alternativeAgents: ["agent-456", "agent-789"],
        }
      );

      expect(error.code).toBe(ErrorCodes.AGENT_UNAVAILABLE);
      expect(error.message).toBe("Agent is currently unavailable");
      expect(error.details?.agentId).toBe("agent-123");
    });

    it("should handle invalid configuration scenario", () => {
      const error = new ConversationError(
        ErrorCodes.INVALID_CONFIGURATION,
        "Invalid audio configuration provided",
        {
          configKey: "audioQuality.sampleRate",
          providedValue: 99999,
          validValues: [8000, 16000, 44100, 48000],
          suggestion: "Use a standard audio sample rate",
        }
      );

      expect(error.code).toBe(ErrorCodes.INVALID_CONFIGURATION);
      expect(error.message).toBe("Invalid audio configuration provided");
      expect(error.details?.configKey).toBe("audioQuality.sampleRate");
    });
  });

  describe("Error Recovery Scenarios", () => {
    it("should provide actionable error information", () => {
      const error = new ConversationError(
        ErrorCodes.PERMISSION_DENIED,
        "Microphone permission required",
        {
          recoveryAction: "REQUEST_PERMISSION",
          userMessage: "Please grant microphone permission to continue",
          settingsPath: "Settings > Privacy > Microphone",
        }
      );

      expect(error.details?.recoveryAction).toBe("REQUEST_PERMISSION");
      expect(error.details?.userMessage).toBe(
        "Please grant microphone permission to continue"
      );
    });

    it("should support retry information", () => {
      const error = new ConversationError(
        ErrorCodes.NETWORK_ERROR,
        "Connection timeout",
        {
          retryable: true,
          retryAfter: 5000,
          maxRetries: 3,
          currentRetry: 1,
        }
      );

      expect(error.details?.retryable).toBe(true);
      expect(error.details?.retryAfter).toBe(5000);
      expect(error.details?.maxRetries).toBe(3);
    });
  });
});
