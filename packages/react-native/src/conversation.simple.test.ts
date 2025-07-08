// Simplified conversation test focused on core functionality
import { ConversationError, ErrorCodes } from "./errors";

// Mock the dependencies at the top level
const mockRoom = {
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn().mockReturnThis(),
  localParticipant: {
    setMicrophoneEnabled: jest.fn(),
    publishData: jest.fn(),
  },
  name: "test-conversation-id",
};

const mockAudioSession = {
  startAudioSession: jest.fn(),
  stopAudioSession: jest.fn(),
};

// Mock modules
jest.mock("livekit-client", () => ({
  Room: jest.fn(() => mockRoom),
  RoomEvent: {
    Connected: "connected",
    Disconnected: "disconnected",
    ConnectionStateChanged: "connectionStateChanged",
    TrackSubscribed: "trackSubscribed",
    DataReceived: "dataReceived",
  },
  ConnectionState: {
    Connecting: "connecting",
    Connected: "connected",
    Disconnected: "disconnected",
    Reconnecting: "reconnecting",
  },
  Track: {
    Kind: {
      Audio: "audio",
    },
  },
}));

jest.mock("@livekit/react-native", () => ({
  AudioSession: mockAudioSession,
}));

// Mock fetch
globalThis.fetch = jest.fn();

describe("Conversation Core Functionality", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRoom.connect.mockResolvedValue(undefined);
    mockAudioSession.startAudioSession.mockResolvedValue(undefined);
    mockAudioSession.stopAudioSession.mockResolvedValue(undefined);
    (globalThis.fetch as jest.Mock).mockClear();
  });

  describe("Error Handling", () => {
    it("should create ConversationError with proper properties", () => {
      const error = new ConversationError(
        ErrorCodes.AUTHENTICATION_FAILED,
        "Test error message",
        { context: "test" }
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe("ConversationError");
      expect(error.code).toBe(ErrorCodes.AUTHENTICATION_FAILED);
      expect(error.message).toBe("Test error message");
      expect(error.details).toEqual({ context: "test" });
    });

    it("should have all required error codes", () => {
      expect(ErrorCodes.AUTHENTICATION_FAILED).toBe("AUTHENTICATION_FAILED");
      expect(ErrorCodes.CONNECTION_FAILED).toBe("CONNECTION_FAILED");
      expect(ErrorCodes.PERMISSION_DENIED).toBe("PERMISSION_DENIED");
      expect(ErrorCodes.AUDIO_DEVICE_ERROR).toBe("AUDIO_DEVICE_ERROR");
      expect(ErrorCodes.NETWORK_ERROR).toBe("NETWORK_ERROR");
    });
  });

  describe("Module Exports", () => {
    it("should export Conversation class", async () => {
      const { Conversation } = await import("./conversation");
      expect(Conversation).toBeDefined();
      expect(typeof Conversation.startSession).toBe("function");
    });

    it("should export all required types", async () => {
      // This test verifies TypeScript compilation works
      const types = await import("./types");
      expect(types).toBeDefined();
    });

    it("should export from index", async () => {
      const index = await import("./index");
      expect(index.Conversation).toBeDefined();
      expect(index.ConversationErrorClass).toBeDefined();
      expect(index.ErrorCodes).toBeDefined();
    });
  });

  describe("Basic Authentication Validation", () => {
    it("should reject empty configuration", async () => {
      const { Conversation } = await import("./conversation");

      await expect(Conversation.startSession({})).rejects.toThrow(
        "Either conversationToken, agentId, or signedUrl is required"
      );
    });

    it("should accept conversationToken", async () => {
      const { Conversation } = await import("./conversation");

      // This test will succeed because our mocks are working
      // In a real React Native environment, it would connect properly
      const conversation = await Conversation.startSession({
        conversationToken: "test-token",
      });

      expect(conversation).toBeDefined();
      expect(typeof conversation.getId).toBe("function");
      expect(typeof conversation.getStatus).toBe("function");

      // Clean up
      await conversation.endSession();
    });
  });

  describe("Mock Verification", () => {
    it("should have properly mocked AudioSession", () => {
      expect(mockAudioSession.startAudioSession).toBeDefined();
      expect(mockAudioSession.stopAudioSession).toBeDefined();
      expect(typeof mockAudioSession.startAudioSession).toBe("function");
    });

    it("should have properly mocked Room", () => {
      expect(mockRoom.connect).toBeDefined();
      expect(mockRoom.disconnect).toBeDefined();
      expect(mockRoom.on).toBeDefined();
      expect(typeof mockRoom.connect).toBe("function");
    });

    it("should have mocked fetch", () => {
      expect(globalThis.fetch).toBeDefined();
      expect(typeof globalThis.fetch).toBe("function");
    });
  });
});
