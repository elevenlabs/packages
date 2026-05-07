import { describe, it, expect, vi } from "vitest";
import React from "react";
import { renderHook } from "@testing-library/react";
import type { ClientToolsConfig } from "@elevenlabs/client";
import {
  ConversationContext,
  type ConversationContextValue,
} from "./ConversationContext.js";
import {
  ConversationClientToolsProvider,
  useConversationClientTool,
  buildClientTools,
} from "./ConversationClientTools.js";

type ClientToolEntry = ClientToolsConfig["clientTools"][string];

function createContextValue(
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

  it("registers a tool on the live clientTools object and in the registry", () => {
    const registry = new Map<string, ClientToolEntry>();
    const clientTools: Record<string, ClientToolEntry> = {};
    const value = createContextValue({
      clientToolsRegistry: registry,
      clientToolsRef: { current: clientTools },
    });
    const handler = vi.fn().mockReturnValue("result");

    renderHook(() => useConversationClientTool("my_tool", handler), {
      wrapper: createWrapper(value),
    });

    expect(clientTools).toHaveProperty("my_tool");
    expect(typeof clientTools.my_tool).toBe("function");
    expect(registry.has("my_tool")).toBe(true);
  });

  it("unregisters the tool on unmount", () => {
    const registry = new Map<string, ClientToolEntry>();
    const clientTools: Record<string, ClientToolEntry> = {};
    const value = createContextValue({
      clientToolsRegistry: registry,
      clientToolsRef: { current: clientTools },
    });

    const { unmount } = renderHook(
      () => useConversationClientTool("my_tool", () => "ok"),
      { wrapper: createWrapper(value) }
    );

    expect(clientTools).toHaveProperty("my_tool");
    expect(registry.has("my_tool")).toBe(true);

    unmount();

    expect(clientTools).not.toHaveProperty("my_tool");
    expect(registry.has("my_tool")).toBe(false);
  });

  it("delegates to the handler when the registered tool is called", async () => {
    const clientTools: Record<string, ClientToolEntry> = {};
    const value = createContextValue({
      clientToolsRef: { current: clientTools },
    });
    const handler = vi.fn().mockReturnValue("sunny");

    renderHook(() => useConversationClientTool("get_weather", handler), {
      wrapper: createWrapper(value),
    });

    const result = await clientTools.get_weather({ city: "London" });

    expect(handler).toHaveBeenCalledWith({ city: "London" });
    expect(result).toBe("sunny");
  });

  it("always delegates to the latest handler (ref pattern)", async () => {
    const clientTools: Record<string, ClientToolEntry> = {};
    const value = createContextValue({
      clientToolsRef: { current: clientTools },
    });
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

    const result = await clientTools.my_tool({});

    expect(firstHandler).not.toHaveBeenCalled();
    expect(secondHandler).toHaveBeenCalled();
    expect(result).toBe("second");
  });

  it("throws when registering a duplicate tool name (hook vs hook)", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const registry = new Map<string, ClientToolEntry>();
    const clientTools: Record<string, ClientToolEntry> = {};
    const value = createContextValue({
      clientToolsRegistry: registry,
      clientToolsRef: { current: clientTools },
    });
    const wrapper = createWrapper(value);

    renderHook(
      () => useConversationClientTool("shared_tool", () => "first"),
      { wrapper }
    );

    expect(() =>
      renderHook(
        () => useConversationClientTool("shared_tool", () => "second"),
        { wrapper }
      )
    ).toThrow(
      'Client tool "shared_tool" is already registered by another hook.'
    );
    consoleSpy.mockRestore();
  });

  it("re-registers when the tool name changes", () => {
    const registry = new Map<string, ClientToolEntry>();
    const clientTools: Record<string, ClientToolEntry> = {};
    const value = createContextValue({
      clientToolsRegistry: registry,
      clientToolsRef: { current: clientTools },
    });

    const { rerender } = renderHook(
      ({ name }) => useConversationClientTool(name, vi.fn().mockReturnValue("ok")),
      {
        wrapper: createWrapper(value),
        initialProps: { name: "tool_a" },
      }
    );

    expect(clientTools).toHaveProperty("tool_a");
    expect(clientTools).not.toHaveProperty("tool_b");
    expect(registry.has("tool_a")).toBe(true);

    rerender({ name: "tool_b" });

    expect(clientTools).not.toHaveProperty("tool_a");
    expect(clientTools).toHaveProperty("tool_b");
    expect(registry.has("tool_a")).toBe(false);
    expect(registry.has("tool_b")).toBe(true);
  });
});

describe("buildClientTools", () => {
  it("merges option-provided and registry tools", () => {
    const optionHandler = vi.fn();
    const hookHandler = vi.fn();
    const registry = new Map<string, ClientToolEntry>([
      ["hook_tool", hookHandler],
    ]);

    const result = buildClientTools({ option_tool: optionHandler }, registry);

    expect(result).toEqual({
      option_tool: optionHandler,
      hook_tool: hookHandler,
    });
  });

  it("throws when a hook tool conflicts with an option-provided tool", () => {
    const handler = vi.fn();
    const registry = new Map<string, ClientToolEntry>([
      ["duplicate", handler],
    ]);

    expect(() => buildClientTools({ duplicate: vi.fn() }, registry)).toThrow(
      'Client tool "duplicate" is already provided via props/options.'
    );
  });

  it("handles undefined optionTools", () => {
    const handler = vi.fn();
    const registry = new Map<string, ClientToolEntry>([
      ["my_tool", handler],
    ]);

    const result = buildClientTools(undefined, registry);

    expect(result).toEqual({ my_tool: handler });
  });
});
