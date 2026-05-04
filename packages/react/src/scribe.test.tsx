import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Scribe } from "@elevenlabs/client";
import type { RealtimeConnection } from "@elevenlabs/client";
import { useScribe } from "./scribe.js";

vi.mock("@elevenlabs/client", async importOriginal => {
  const actual = await importOriginal<typeof import("@elevenlabs/client")>();
  return {
    ...actual,
    Scribe: {
      connect: vi.fn(),
    },
  };
});

function createMockConnection(): RealtimeConnection {
  return {
    on: vi.fn(),
    close: vi.fn(),
    send: vi.fn(),
    commit: vi.fn(),
  } as unknown as RealtimeConnection;
}

describe("useScribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Scribe.connect).mockReturnValue(createMockConnection());
  });

  it("passes constrained microphone device IDs through to the client", async () => {
    const deviceId = { exact: "selected-microphone-id" };

    const { result } = renderHook(() => useScribe());

    await act(async () => {
      await result.current.connect({
        token: "test-token",
        modelId: "scribe_v2_realtime",
        microphone: {
          deviceId,
        },
      });
    });

    expect(Scribe.connect).toHaveBeenCalledWith(
      expect.objectContaining({
        microphone: expect.objectContaining({
          deviceId,
        }),
      })
    );
  });
});
