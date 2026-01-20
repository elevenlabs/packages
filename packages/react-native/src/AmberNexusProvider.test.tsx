import React from 'react';
import { render } from '@testing-library/react-native';
import { AmberNexusProvider, useConversation } from './AmberNexusProvider';
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
    defaultServerUrl: 'https://api.ambernexus.io/v1/amber-agent',
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
  LiveKitRoomWrapper: ({ children }: { children: ReactNode }) => (
    // The actual LiveKitRoomWrapper receives key prop from parent (AmberNexusProvider)
    // Children are passed through and should not remount when key changes
    <div>{children}</div>
  ),
}));

describe('AmberNexusProvider', () => {
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
      }).toThrow('useConversation must be used within AmberNexusProvider');

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
          <AmberNexusProvider>
            <TestComponent />
          </AmberNexusProvider>
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
          <AmberNexusProvider>
            <TestComponent />
          </AmberNexusProvider>
        );
      }).not.toThrow();
    });

    it('should render children components successfully', () => {
      // Simple test - if rendering doesn't throw, children are successfully rendered
      expect(() => {
        render(
          <AmberNexusProvider>
            <TestText>Child component rendered</TestText>
          </AmberNexusProvider>
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
          <AmberNexusProvider>
            <TestComponent />
          </AmberNexusProvider>
        );
      }).not.toThrow();
    });

    it('should maintain stable conversation object reference to prevent infinite loops', () => {
      const useEffectCallCount = jest.fn();
      const conversationRefs: any[] = [];
      let capturedConversation: any = null;

      const TestComponent = () => {
        const conversation = useConversation();

        // Capture conversation for external testing
        capturedConversation = conversation;

        // Track the conversation object reference on each render
        conversationRefs.push(conversation);

        // Using conversation in useEffect deps should not cause an infinite loop
        React.useEffect(() => {
          useEffectCallCount();
          // Simulate calling startSession which triggers state changes
          // In real usage, this would call conversation.startSession(...)
        }, [conversation]);

        return <TestText>Test component</TestText>;
      };

      const { rerender } = render(
        <AmberNexusProvider>
          <TestComponent />
        </AmberNexusProvider>
      );

      // Initial render - effect should run once
      expect(useEffectCallCount).toHaveBeenCalledTimes(1);
      const firstConversationRef = conversationRefs[0];

      // Verify the conversation object has all required properties
      expect(firstConversationRef).toHaveProperty('startSession');
      expect(firstConversationRef).toHaveProperty('endSession');
      expect(firstConversationRef).toHaveProperty('status');
      expect(firstConversationRef).toHaveProperty('isSpeaking');

      // Force a re-render by calling rerender
      rerender(
        <AmberNexusProvider>
          <TestComponent />
        </AmberNexusProvider>
      );

      // After re-render, verify conversation reference is still the same
      expect(conversationRefs[conversationRefs.length - 1]).toBe(firstConversationRef);

      // Effect should NOT run again because conversation reference is stable
      expect(useEffectCallCount).toHaveBeenCalledTimes(1);

      // Verify ALL conversation references collected are the same object
      conversationRefs.forEach((ref, index) => {
        expect(ref).toBe(firstConversationRef);
      });
    });
  });
});