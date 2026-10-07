import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./compatibility.js", () => ({
  isIosDevice: vi.fn(() => true),
}));

import { isIosDevice } from "./compatibility.js";
import {
  discardStashedAudioContext,
  installIosAudioUnlockListener,
  takeUnlockedAudioContext,
  unlockIosAudioForSession,
} from "./audioUnlock.js";

describe("unlockIosAudioForSession", () => {
  beforeEach(() => {
    vi.mocked(isIosDevice).mockReturnValue(true);
    vi.stubGlobal(
      "AudioContext",
      vi.fn(function MockAudioContext(this: {
        createBuffer: ReturnType<typeof vi.fn>;
        createBufferSource: ReturnType<typeof vi.fn>;
        destination: object;
        resume: ReturnType<typeof vi.fn>;
        close: ReturnType<typeof vi.fn>;
      }) {
        this.createBuffer = vi.fn(() => ({}));
        this.createBufferSource = vi.fn(() => ({
          buffer: null,
          connect: vi.fn(),
          start: vi.fn(),
        }));
        this.destination = {};
        this.resume = vi.fn().mockResolvedValue(undefined);
        this.close = vi.fn().mockResolvedValue(undefined);
      })
    );
  });

  afterEach(() => {
    discardStashedAudioContext();
    vi.unstubAllGlobals();
  });

  it("returns null from take when not on iOS", () => {
    vi.mocked(isIosDevice).mockReturnValue(false);

    unlockIosAudioForSession();

    expect(takeUnlockedAudioContext()).toBeNull();
  });

  it("stashes an AudioContext on iOS until taken", () => {
    unlockIosAudioForSession();
    const ctx = takeUnlockedAudioContext();

    expect(ctx).not.toBeNull();
    expect(takeUnlockedAudioContext()).toBeNull();
  });

  it("does not stash a second context when called twice", () => {
    unlockIosAudioForSession();
    unlockIosAudioForSession();

    expect(takeUnlockedAudioContext()).not.toBeNull();
    expect(takeUnlockedAudioContext()).toBeNull();
  });

  it("is a no-op when Web Audio is unavailable (iOS Lockdown Mode)", () => {
    vi.stubGlobal("AudioContext", undefined);

    expect(() => unlockIosAudioForSession()).not.toThrow();
    expect(takeUnlockedAudioContext()).toBeNull();
  });

  it("discardStashedAudioContext clears an untaken stash", () => {
    unlockIosAudioForSession();

    discardStashedAudioContext();

    expect(takeUnlockedAudioContext()).toBeNull();
  });
});

describe("installIosAudioUnlockListener", () => {
  beforeEach(() => {
    vi.mocked(isIosDevice).mockReturnValue(true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Must run before the registering test: installation is once per module.
  it("does not register listeners when Web Audio is unavailable", () => {
    const addEventListener = vi.fn();
    vi.stubGlobal("document", { addEventListener });
    vi.stubGlobal("AudioContext", undefined);

    installIosAudioUnlockListener();

    expect(addEventListener).not.toHaveBeenCalled();
  });

  it("registers capture-phase gesture listeners on iOS", () => {
    const addEventListener = vi.fn();
    vi.stubGlobal("document", { addEventListener });
    vi.stubGlobal("AudioContext", vi.fn());

    installIosAudioUnlockListener();

    expect(addEventListener).toHaveBeenCalledTimes(3);
    expect(addEventListener).toHaveBeenCalledWith(
      "touchstart",
      expect.any(Function),
      true
    );
  });
});
