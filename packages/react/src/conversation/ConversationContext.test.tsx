import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import {
  ConversationContext,
  useRawConversation,
  type ConversationContextValue,
} from "./ConversationContext";
import type { Conversation } from "@elevenlabs/client";

describe("useRawConversation", () => {
  it("returns null when used outside a ConversationProvider", () => {
    const { result } = renderHook(() => useRawConversation());
    expect(result.current).toBeNull();
  });

  it("returns the conversation instance from the context", () => {
    const mockConversation = { getId: vi.fn() } as unknown as Conversation;
    const value: ConversationContextValue = {
      conversation: mockConversation,
      conversationRef: { current: mockConversation },
      startSession: vi.fn(),
      endSession: vi.fn(),
      registerCallbacks: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConversationContext.Provider value={value}>
        {children}
      </ConversationContext.Provider>
    );

    const { result } = renderHook(() => useRawConversation(), { wrapper });
    expect(result.current).toBe(mockConversation);
  });

  it("returns null when conversation is null in context", () => {
    const value: ConversationContextValue = {
      conversation: null,
      conversationRef: { current: null },
      startSession: vi.fn(),
      endSession: vi.fn(),
      registerCallbacks: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConversationContext.Provider value={value}>
        {children}
      </ConversationContext.Provider>
    );

    const { result } = renderHook(() => useRawConversation(), { wrapper });
    expect(result.current).toBeNull();
  });
});
