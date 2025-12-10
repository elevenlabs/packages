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
  LiveKitRoomWrapper: ({ children, roomKey }: { children: ReactNode; roomKey?: string }) => (
    // Pass roomKey as key to an internal div to simulate the behavior
    // This allows us to test if children remount when roomKey changes
    <div key={roomKey}>{children}</div>
  ),
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

        // Suppress console.warn for sendFeedback test since canSendFeedback is false by default
        const originalWarn = console.warn;
        console.warn = jest.fn();

        // Test that all methods can be called safely
        expect(() => conversation.startSession({ agentId: 'test' })).not.toThrow();
        expect(() => conversation.endSession()).not.toThrow();
        expect(() => conversation.sendFeedback(true)).not.toThrow();
        expect(() => conversation.sendContextualUpdate('test context')).not.toThrow();
        expect(() => conversation.sendUserMessage('test message')).not.toThrow();
        expect(() => conversation.sendUserActivity()).not.toThrow();

        // Restore console.warn
        console.warn = originalWarn;

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

    it('should not remount children when startSession is called in useEffect', () => {
      const mountSpy = jest.fn();
      const unmountSpy = jest.fn();
      const startSessionSpy = jest.fn();

      const ChildComponent = () => {
        React.useEffect(() => {
          mountSpy();
          return () => {
            unmountSpy();
          };
        }, []);

        return <TestText>Child component</TestText>;
      };

      const TestComponent = () => {
        const conversation = useConversation();

        // This is the problematic pattern from the issue - calling startSession in useEffect
        React.useEffect(() => {
          startSessionSpy();
          conversation.startSession({ agentId: 'test' });
        }, [conversation]);

        return <ChildComponent />;
      };

      render(
        <ElevenLabsProvider>
          <TestComponent />
        </ElevenLabsProvider>
      );

      // Without the fix, this would cause an infinite loop:
      // 1. Component mounts
      // 2. useEffect calls startSession
      // 3. conversationId changes, causing key change on LiveKitRoomWrapper
      // 4. Children unmount and remount
      // 5. useEffect runs again → infinite loop

      // With the fix, child should mount only once
      expect(mountSpy).toHaveBeenCalledTimes(1);
      expect(unmountSpy).not.toHaveBeenCalled();

      // startSession should be called only once, not infinitely
      expect(startSessionSpy).toHaveBeenCalledTimes(1);
    });
  });
});