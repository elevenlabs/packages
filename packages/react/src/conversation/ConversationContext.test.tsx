import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import {
  ConversationContext,
  useRawConversation,
  useRawConversationRef,
  useRegisterCallbacks,
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

    const wrapper = ({ children }: React.PropsWithChildren) => (
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
    const value: ConversationContextValue = {
      conversation: mockConversation,
      conversationRef,
      startSession: vi.fn(),
      endSession: vi.fn(),
      registerCallbacks: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConversationContext.Provider value={value}>
        {children}
      </ConversationContext.Provider>
    );

    const { result } = renderHook(() => useRawConversationRef(), { wrapper });
    expect(result.current).toBe(conversationRef);
  });
});

describe("useRegisterCallbacks", () => {
  it("throws when used outside a ConversationProvider", () => {
    expect(() =>
      renderHook(() => useRegisterCallbacks({ onConnect: vi.fn() }))
    ).toThrow("useRegisterCallbacks must be used within a ConversationProvider");
  });

  it("calls registerCallbacks with stable wrappers and cleans up on unmount", () => {
    const unsubscribe = vi.fn();
    const registerCallbacks = vi.fn().mockReturnValue(unsubscribe);
    const value: ConversationContextValue = {
      conversation: null,
      conversationRef: { current: null },
      startSession: vi.fn(),
      endSession: vi.fn(),
      registerCallbacks,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConversationContext.Provider value={value}>
        {children}
      </ConversationContext.Provider>
    );

    const onConnect = vi.fn();
    const { unmount } = renderHook(
      () => useRegisterCallbacks({ onConnect }),
      { wrapper }
    );

    expect(registerCallbacks).toHaveBeenCalledTimes(1);
    // The registered callback should delegate to the original
    const registered = registerCallbacks.mock.calls[0][0];
    registered.onConnect({ conversationId: "test" });
    expect(onConnect).toHaveBeenCalledWith({ conversationId: "test" });

    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("delegates to the latest callback without re-subscribing", () => {
    const unsubscribe = vi.fn();
    const registerCallbacks = vi.fn().mockReturnValue(unsubscribe);
    const value: ConversationContextValue = {
      conversation: null,
      conversationRef: { current: null },
      startSession: vi.fn(),
      endSession: vi.fn(),
      registerCallbacks,
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <ConversationContext.Provider value={value}>
        {children}
      </ConversationContext.Provider>
    );

    const firstCallback = vi.fn();
    const secondCallback = vi.fn();

    const { rerender } = renderHook(
      ({ cb }) => useRegisterCallbacks({ onConnect: cb }),
      { wrapper, initialProps: { cb: firstCallback } }
    );

    // Re-render with a new callback
    rerender({ cb: secondCallback });

    // Should not have re-subscribed
    expect(registerCallbacks).toHaveBeenCalledTimes(1);

    // The stable wrapper should delegate to the latest callback
    const registered = registerCallbacks.mock.calls[0][0];
    registered.onConnect({ conversationId: "test" });
    expect(firstCallback).not.toHaveBeenCalled();
    expect(secondCallback).toHaveBeenCalledWith({ conversationId: "test" });
  });
});
