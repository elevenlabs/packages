import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The URL cache is module-level state, so every case works against a freshly
// imported copy of the module rather than a cache left over from the last one.
async function freshLoader(name = "rawAudioProcessor", source = "// worklet") {
  vi.resetModules();
  const { createWorkletModuleLoader } =
    await import("./createWorkletModuleLoader.js");
  return createWorkletModuleLoader(name, source);
}

function createWorklet() {
  return { addModule: vi.fn().mockResolvedValue(undefined) };
}

let blobUrlCounter = 0;

// These run in a real browser, so Blob/btoa are genuine. Only the object-URL
// helpers are replaced, and by spying rather than stubbing the whole `URL`
// global — overwriting it would take the `URL` constructor with it.
beforeEach(() => {
  blobUrlCounter = 0;
  vi.spyOn(URL, "createObjectURL").mockImplementation(
    () => `blob:mock-${++blobUrlCounter}`
  );
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createWorkletModuleLoader", () => {
  it("uses a self-hosted path even after an inlined load cached a blob", async () => {
    const load = await freshLoader();
    const worklet = createWorklet();

    await load(worklet as unknown as AudioWorklet);
    await load(worklet as unknown as AudioWorklet, "/vendor/raw.js");

    expect(worklet.addModule).toHaveBeenNthCalledWith(1, "blob:mock-1");
    expect(worklet.addModule).toHaveBeenNthCalledWith(2, "/vendor/raw.js");
  });

  it("does not serve one self-hosted path in place of another", async () => {
    const load = await freshLoader();
    const worklet = createWorklet();

    await load(worklet as unknown as AudioWorklet, "/vendor/a.js");
    await load(worklet as unknown as AudioWorklet, "/vendor/b.js");

    expect(worklet.addModule).toHaveBeenNthCalledWith(1, "/vendor/a.js");
    expect(worklet.addModule).toHaveBeenNthCalledWith(2, "/vendor/b.js");
  });

  it("still inlines a blob when no path is given after a path load", async () => {
    const load = await freshLoader();
    const worklet = createWorklet();

    await load(worklet as unknown as AudioWorklet, "/vendor/raw.js");
    await load(worklet as unknown as AudioWorklet);

    expect(worklet.addModule).toHaveBeenNthCalledWith(1, "/vendor/raw.js");
    expect(worklet.addModule).toHaveBeenNthCalledWith(2, "blob:mock-1");
  });

  // Controls: the cache must still do its job for repeated identical requests.

  it("creates only one blob URL across repeated inlined loads", async () => {
    const load = await freshLoader();
    const worklet = createWorklet();

    await load(worklet as unknown as AudioWorklet);
    await load(worklet as unknown as AudioWorklet);
    await load(worklet as unknown as AudioWorklet);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(worklet.addModule).toHaveBeenCalledTimes(3);
    expect(worklet.addModule).toHaveBeenLastCalledWith("blob:mock-1");
  });

  it("reuses the cached entry for a repeated identical path", async () => {
    const load = await freshLoader();
    const worklet = createWorklet();

    await load(worklet as unknown as AudioWorklet, "/vendor/raw.js");
    await load(worklet as unknown as AudioWorklet, "/vendor/raw.js");

    expect(worklet.addModule).toHaveBeenCalledTimes(2);
    expect(worklet.addModule).toHaveBeenNthCalledWith(2, "/vendor/raw.js");
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("keeps separate entries per worklet name", async () => {
    vi.resetModules();
    const { createWorkletModuleLoader } =
      await import("./createWorkletModuleLoader.js");
    const loadRaw = createWorkletModuleLoader("rawAudioProcessor", "// raw");
    const loadConcat = createWorkletModuleLoader(
      "audioConcatProcessor",
      "// concat"
    );
    const worklet = createWorklet();

    await loadRaw(worklet as unknown as AudioWorklet, "/vendor/raw.js");
    await loadConcat(worklet as unknown as AudioWorklet, "/vendor/concat.js");

    expect(worklet.addModule).toHaveBeenNthCalledWith(1, "/vendor/raw.js");
    expect(worklet.addModule).toHaveBeenNthCalledWith(2, "/vendor/concat.js");
  });

  it("reports the requested path when loading from it fails", async () => {
    const load = await freshLoader();
    const worklet = {
      addModule: vi.fn().mockRejectedValue(new Error("blocked by CSP")),
    };

    await expect(
      load(worklet as unknown as AudioWorklet, "/vendor/raw.js")
    ).rejects.toThrow(
      "Failed to load the rawAudioProcessor worklet module from path: /vendor/raw.js"
    );
  });

  it("does not cache a path that failed to load", async () => {
    const load = await freshLoader();
    const failing = {
      addModule: vi.fn().mockRejectedValue(new Error("blocked by CSP")),
    };
    await expect(
      load(failing as unknown as AudioWorklet, "/vendor/raw.js")
    ).rejects.toThrow();

    const worklet = createWorklet();
    await load(worklet as unknown as AudioWorklet, "/vendor/raw.js");

    expect(worklet.addModule).toHaveBeenCalledWith("/vendor/raw.js");
  });
});
