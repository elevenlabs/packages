import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import type { ClientToolsConfig } from "@elevenlabs/client";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext";
import {
  ConversationClientToolsProvider,
  useConversationClientTool,
} from "./ConversationClientTools";

type ClientToolEntry = ClientToolsConfig["clientTools"][string];

function createContextValue(
  overrides: Partial<ConversationContextValue> = {}
): ConversationContextValue {
  return {
    conversation: null,
    conversationRef: { current: null },
    startSession: vi.fn(),
    endSession: vi.fn(),
    registerCallbacks: vi.fn(),
    clientToolsTarget: {},
    ...overrides,
  };
}

function createWrapper(value: ConversationContextValue) {
  return function Wrapper({ children }: React.PropsWithChildren) {
    return (
      <ConversationContext.Provider value={value}>
        <ConversationClientToolsProvider>
          {children}
        </ConversationClientToolsProvider>
      </ConversationContext.Provider>
    );
  };
}

describe("useConversationClientTool", () => {
  it("throws when used outside a ConversationProvider", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderHook(() => useConversationClientTool("test", () => "ok"))
    ).toThrow("useConversationClientTool must be used within a ConversationProvider");
    consoleSpy.mockRestore();
  });

  it("registers a tool on the clientToolsTarget", () => {
    const clientToolsTarget: Record<string, ClientToolEntry> = {};
    const value = createContextValue({ clientToolsTarget });
    const handler = vi.fn().mockReturnValue("result");

    renderHook(() => useConversationClientTool("my_tool", handler), {
      wrapper: createWrapper(value),
    });

    expect(clientToolsTarget).toHaveProperty("my_tool");
    expect(typeof clientToolsTarget.my_tool).toBe("function");
  });

  it("unregisters the tool on unmount", () => {
    const clientToolsTarget: Record<string, ClientToolEntry> = {};
    const value = createContextValue({ clientToolsTarget });

    const { unmount } = renderHook(
      () => useConversationClientTool("my_tool", () => "ok"),
      { wrapper: createWrapper(value) }
    );

    expect(clientToolsTarget).toHaveProperty("my_tool");

    unmount();

    expect(clientToolsTarget).not.toHaveProperty("my_tool");
  });

  it("delegates to the handler when the registered tool is called", async () => {
    const clientToolsTarget: Record<string, ClientToolEntry> = {};
    const value = createContextValue({ clientToolsTarget });
    const handler = vi.fn().mockReturnValue("sunny");

    renderHook(() => useConversationClientTool("get_weather", handler), {
      wrapper: createWrapper(value),
    });

    const result = await clientToolsTarget.get_weather({ city: "London" });

    expect(handler).toHaveBeenCalledWith({ city: "London" });
    expect(result).toBe("sunny");
  });

  it("always delegates to the latest handler (ref pattern)", async () => {
    const clientToolsTarget: Record<string, ClientToolEntry> = {};
    const value = createContextValue({ clientToolsTarget });
    const firstHandler = vi.fn().mockReturnValue("first");
    const secondHandler = vi.fn().mockReturnValue("second");

    const { rerender } = renderHook(
      ({ handler }) => useConversationClientTool("my_tool", handler),
      {
        wrapper: createWrapper(value),
        initialProps: { handler: firstHandler },
      }
    );

    rerender({ handler: secondHandler });

    const result = await clientToolsTarget.my_tool({});

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalled();
    expect(result).toBe("second");
  });

  it("does not remove a newer registration when an older one unmounts", () => {
    const clientToolsTarget: Record<string, ClientToolEntry> = {};
    const value = createContextValue({ clientToolsTarget });
    const wrapper = createWrapper(value);

    const first = renderHook(
      () => useConversationClientTool("shared_tool", () => "first"),
      { wrapper }
    );

    renderHook(
      () => useConversationClientTool("shared_tool", () => "second"),
      { wrapper }
    );

    // Unmounting the first registration should NOT remove the tool,
    // because the target now holds the second handler.
    first.unmount();

    expect(clientToolsTarget).toHaveProperty("shared_tool");
  });

  it("re-registers when the tool name changes", async () => {
    const clientToolsTarget: Record<string, ClientToolEntry> = {};
    const value = createContextValue({ clientToolsTarget });
    const handler = vi.fn().mockReturnValue("ok");

    const { rerender } = renderHook(
      ({ name }) => useConversationClientTool(name, handler),
      {
        wrapper: createWrapper(value),
        initialProps: { name: "tool_a" },
      }
    );

    expect(clientToolsTarget).toHaveProperty("tool_a");
    expect(clientToolsTarget).not.toHaveProperty("tool_b");

    rerender({ name: "tool_b" });

    expect(clientToolsTarget).not.toHaveProperty("tool_a");
    expect(clientToolsTarget).toHaveProperty("tool_b");
  });
});
