import { vi } from "vitest";
import type { Conversation } from "@elevenlabs/client";

type MockEventListeners = Map<string, Set<(...args: unknown[]) => void>>;

export type MockConversation = Conversation & {
  /** Test helper: emit an event to all registered listeners */
  __emit: (event: string, ...args: unknown[]) => void;
  /** Test helper: access the raw listener map */
  __listeners: MockEventListeners;
};

export function createMockConversation(id = "test-id"): MockConversation {
  const listeners: MockEventListeners = new Map();

  const on = vi.fn((event: string, listener: (...args: unknown[]) => void) => {
    let set = listeners.get(event);
    if (!set) {
      set = new Set();
      listeners.set(event, set);
    }
    set.add(listener);
    return () => {
      set.delete(listener);
    };
  });

  const __emit = (event: string, ...args: unknown[]) => {
    const set = listeners.get(event);
    if (set) {
      for (const listener of set) listener(...args);
    }
  };

  return {
    getId: vi.fn().mockReturnValue(id),
    isOpen: vi.fn().mockReturnValue(true),
    endSession: vi.fn().mockResolvedValue(undefined),
    setMicMuted: vi.fn(),
    setVolume: vi.fn(),
    sendUserMessage: vi.fn(),
    sendMultimodalMessage: vi.fn(),
    uploadFile: vi.fn(),
    sendContextualUpdate: vi.fn(),
    sendUserActivity: vi.fn(),
    sendMCPToolApprovalResult: vi.fn(),
    sendFeedback: vi.fn(),
    getInputByteFrequencyData: vi.fn().mockReturnValue(new Uint8Array(0)),
    getOutputByteFrequencyData: vi.fn().mockReturnValue(new Uint8Array(0)),
    getInputVolume: vi.fn().mockReturnValue(0),
    getOutputVolume: vi.fn().mockReturnValue(0),
    on,
    __emit,
    __listeners: listeners,
  } as unknown as MockConversation;
}
