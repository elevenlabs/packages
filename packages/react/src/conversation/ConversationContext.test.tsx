import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import {
  ConversationContext,
  useRawConversation,
  useRawConversationRef,
  useSessionLifecycle,
  type ConversationContextValue,
} from "./ConversationContext.js";
import type { Conversation } from "@elevenlabs/client";

function createMockContextValue(
  overrides: Partial<ConversationContextValue> = {}
): ConversationContextValue {
  return {
    conversation: null,
    conversationRef: { current: null },
    startSession: vi.fn(),
    endSession: vi.fn(),
    isStarting: false,
    startupError: null,
    clientToolsRegistry: new Map(),
    clientToolsRef: { current: {} },
    ...overrides,
  };
}

describe("useRawConversation", () => {
  it("returns null when used outside a ConversationProvider", () => {
    const { result } = renderHook(() => useRawConversation());
    expect(result.current).toBeNull();
  });

  it("returns the conversation instance from the context", () => {
    const mockConversation = { getId: vi.fn() } as unknown as Conversation;
    const value = createMockContextValue({
      conversation: mockConversation,
      conversationRef: { current: mockConversation },
    });

    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ConversationContext.Provider value={value}>
        {children}
      </ConversationContext.Provider>
    );

    const { result } = renderHook(() => useRawConversation(), { wrapper });
    expect(result.current).toBe(mockConversation);
  });

  it("returns null when conversation is null in context", () => {
    const value = createMockContextValue();

    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ConversationContext.Provider value={value}>
        {children}
      </ConversationContext.Provider>
    );

    const { result } = renderHook(() => useRawConversation(), { wrapper });
    expect(result.current).toBeNull();
  });
});

describe("useRawConversationRef", () => {
  it("throws when used outside a ConversationProvider", () => {
    expect(() => renderHook(() => useRawConversationRef())).toThrow(
      "useRawConversationRef must be used within a ConversationProvider"
    );
  });

  it("returns the conversationRef from the context", () => {
    const mockConversation = { getId: vi.fn() } as unknown as Conversation;
    const conversationRef = { current: mockConversation };
    const value = createMockContextValue({
      conversation: mockConversation,
      conversationRef,
    });

    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ConversationContext.Provider value={value}>
        {children}
      </ConversationContext.Provider>
    );

    const { result } = renderHook(() => useRawConversationRef(), { wrapper });
    expect(result.current).toBe(conversationRef);
  });
});

describe("useSessionLifecycle", () => {
  it("throws when used outside a ConversationProvider", () => {
    expect(() => renderHook(() => useSessionLifecycle())).toThrow(
      "useSessionLifecycle must be used within a ConversationProvider"
    );
  });

  it("returns isStarting and startupError from context", () => {
    const value = createMockContextValue({
      isStarting: true,
      startupError: "test error",
    });

    const wrapper = ({ children }: React.PropsWithChildren) => (
      <ConversationContext.Provider value={value}>
        {children}
      </ConversationContext.Provider>
    );

    const { result } = renderHook(() => useSessionLifecycle(), { wrapper });
    expect(result.current.isStarting).toBe(true);
    expect(result.current.startupError).toBe("test error");
  });
});
