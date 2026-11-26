import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./compatibility.js", () => ({
  isAndroidDevice: () => false,
  isIosDevice: () => false,
}));

vi.mock("../../utils/ConnectionFactory.js", () => ({
  createConnection: vi.fn().mockRejectedValue(new Error("stop after mic")),
}));

import type { Options } from "../../BaseConversation.js";
import { webSessionSetup } from "./VoiceSessionSetup.js";

function installMediaDevices() {
  const track = { stop: vi.fn() };
  const getUserMedia = vi.fn().mockResolvedValue({ getTracks: () => [track] });
  vi.stubGlobal("navigator", { mediaDevices: { getUserMedia } });
  return { getUserMedia, track };
}

async function runSetup(options: Partial<Options>) {
  await expect(
    webSessionSetup({ useWakeLock: false, ...options } as Options)
  ).rejects.toThrow("stop after mic");
}

describe("webSessionSetup preliminary microphone request", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("asks for the chosen input device when inputDeviceId is set", async () => {
    const { getUserMedia, track } = installMediaDevices();

    await runSetup({ inputDeviceId: "built-in-mic" });

    expect(getUserMedia).toHaveBeenCalledOnce();
    expect(getUserMedia).toHaveBeenCalledWith({
      audio: { deviceId: { ideal: "built-in-mic" } },
    });
    expect(track.stop).toHaveBeenCalledOnce();
  });

  it("asks for the default microphone when inputDeviceId is not set", async () => {
    const { getUserMedia } = installMediaDevices();

    await runSetup({});

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
  });

  it("asks for the default microphone when inputDeviceId is empty", async () => {
    const { getUserMedia } = installMediaDevices();

    await runSetup({ inputDeviceId: "" });

    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
  });
});
