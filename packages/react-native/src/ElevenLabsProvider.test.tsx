import React from 'react';
import { render } from '@testing-library/react-native';
import { ElevenLabsProvider, useConversation } from './ElevenLabsProvider';
import type { ReactNode } from 'react';

// Suppress react-test-renderer deprecation warnings during tests
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  console.warn = (...args) => {
    if (args[0]?.includes?.('react-test-renderer is deprecated')) return;
    originalWarn(...args);
  };
  console.error = (...args) => {
    if (args[0]?.includes?.('react-test-renderer is deprecated')) return;
    originalError(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Simple test component to avoid React Native import issues
const TestText = ({ children }: { children: ReactNode }) => (
  <div>{children}</div>
);

// Mock LiveKit
jest.mock('@livekit/react-native', () => ({
  registerGlobals: jest.fn(),
}));

// Mock hooks with inline functions to avoid hoisting issues
jest.mock('./hooks/useConversationSession', () => ({
  useConversationSession: () => ({
    startSession: jest.fn(),
    endSession: jest.fn(),
    overrides: {},
    customLlmExtraBody: undefined,
    defaultServerUrl: 'https://api.elevenlabs.io/v1/convai',
  }),
}));

jest.mock('./hooks/useConversationCallbacks', () => ({
  useConversationCallbacks: () => ({
    callbacksRef: { current: {} },
    setCallbacks: jest.fn(),
  }),
}));

jest.mock('./hooks/useLiveKitRoom', () => ({
  useLiveKitRoom: () => ({
    room: null,
    localParticipant: null,
    roomConnected: false,
    handleParticipantReady: jest.fn(),
    handleConnected: jest.fn(),
    handleDisconnected: jest.fn(),
    handleError: jest.fn(),
  }),
}));

jest.mock('./hooks/useMessageSending', () => ({
  useMessageSending: () => ({
    sendMessage: jest.fn(),
    sendFeedback: jest.fn(),
    sendContextualUpdate: jest.fn(),
    sendUserMessage: jest.fn(),
    sendUserActivity: jest.fn(),
  }),
}));

jest.mock('./components/MessageHandler', () => ({
  MessageHandler: () => null,
}));

jest.mock('./components/LiveKitRoomWrapper', () => ({
  LiveKitRoomWrapper: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe('ElevenLabsProvider', () => {
  describe('Core Functionality', () => {
    it('should throw error when useConversation is used outside provider', () => {
      const BadComponent = () => {
        useConversation();
        return <TestText>Should not render</TestText>;
      };

      const originalError = console.error;
      console.error = jest.fn();

      expect(() => {
        render(<BadComponent />);
      }).toThrow('useConversation must be used within ElevenLabsProvider');

      console.error = originalError;
    });

    it('should provide conversation context and all methods when used within provider', () => {
      const TestComponent = () => {
        const conversation = useConversation();

        // Verify all methods exist and are functions
        expect(typeof conversation.startSession).toBe('function');
        expect(typeof conversation.endSession).toBe('function');
        expect(typeof conversation.sendFeedback).toBe('function');
        expect(typeof conversation.sendContextualUpdate).toBe('function');
        expect(typeof conversation.sendUserMessage).toBe('function');
        expect(typeof conversation.sendUserActivity).toBe('function');

        // Verify all properties exist with correct types
        expect(typeof conversation.status).toBe('string');
        expect(typeof conversation.isSpeaking).toBe('boolean');
        expect(typeof conversation.canSendFeedback).toBe('boolean');

        return <TestText>Test passed</TestText>;
      };

      expect(() => {
        render(
          <ElevenLabsProvider>
            <TestComponent />
          </ElevenLabsProvider>
        );
      }).not.toThrow();
    });

    it('should allow methods to be called without throwing errors', () => {
      const TestComponent = () => {
        const conversation = useConversation();

        // Test that all methods can be called safely
        expect(() => conversation.startSession({ agentId: 'test' })).not.toThrow();
        expect(() => conversation.endSession()).not.toThrow();
        expect(() => conversation.sendFeedback(true)).not.toThrow();
        expect(() => conversation.sendContextualUpdate('test context')).not.toThrow();
        expect(() => conversation.sendUserMessage('test message')).not.toThrow();
        expect(() => conversation.sendUserActivity()).not.toThrow();

        return <TestText>Method tests passed</TestText>;
      };

      expect(() => {
        render(
          <ElevenLabsProvider>
            <TestComponent />
          </ElevenLabsProvider>
        );
      }).not.toThrow();
    });

    it('should render children components successfully', () => {
      // Simple test - if rendering doesn't throw, children are successfully rendered
      expect(() => {
        render(
          <ElevenLabsProvider>
            <TestText>Child component rendered</TestText>
          </ElevenLabsProvider>
        );
      }).not.toThrow();
    });

    it('should provide conversation context with options', () => {
      const TestComponent = () => {
        const conversation = useConversation({
          onConnect: jest.fn(),
          onDisconnect: jest.fn(),
          onError: jest.fn(),
        });

        expect(conversation).toBeDefined();
        return <TestText>Options test passed</TestText>;
      };

      expect(() => {
        render(
          <ElevenLabsProvider>
            <TestComponent />
          </ElevenLabsProvider>
        );
      }).not.toThrow();
    });
  });
});