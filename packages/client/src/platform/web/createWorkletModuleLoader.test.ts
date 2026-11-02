import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const HASH = "0123456789abcdef";

// The URL cache is module-level state, so every case works against a freshly
// imported copy of the module rather than a cache left over from the last one.
async function freshLoader(name = "rawAudioProcessor", source = "// worklet") {
  vi.resetModules();
  const { createWorkletModuleLoader } =
    await import("./createWorkletModuleLoader.js");
  return createWorkletModuleLoader(name, HASH, source);
}

function createContext(
  addModule = vi.fn().mockResolvedValue(undefined)
): BaseAudioContext & { audioWorklet: { addModule: typeof addModule } } {
  return { audioWorklet: { addModule } } as never;
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
  vi.stubGlobal(
    "AudioWorkletNode",
    vi.fn(function MockAudioWorkletNode(
      this: Record<string, unknown>,
      context: BaseAudioContext,
      name: string,
      options?: AudioWorkletNodeOptions
    ) {
      Object.assign(this, { context, name, options });
    })
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("createWorkletModuleLoader", () => {
  it("uses a self-hosted path even after an inlined load cached a blob", async () => {
    const load = await freshLoader();
    const context = createContext();

    await load(context);
    await load(context, "/vendor/raw.js");

    expect(context.audioWorklet.addModule).toHaveBeenNthCalledWith(
      1,
      "blob:mock-1"
    );
    expect(context.audioWorklet.addModule).toHaveBeenNthCalledWith(
      2,
      "/vendor/raw.js"
    );
  });

  it("does not serve one self-hosted path in place of another", async () => {
    const load = await freshLoader();
    const context = createContext();

    await load(context, "/vendor/a.js");
    await load(context, "/vendor/b.js");

    expect(context.audioWorklet.addModule).toHaveBeenNthCalledWith(
      1,
      "/vendor/a.js"
    );
    expect(context.audioWorklet.addModule).toHaveBeenNthCalledWith(
      2,
      "/vendor/b.js"
    );
  });

  it("still inlines a blob when no path is given after a path load", async () => {
    const load = await freshLoader();
    const context = createContext();

    await load(context, "/vendor/raw.js");
    await load(context);

    expect(context.audioWorklet.addModule).toHaveBeenNthCalledWith(
      1,
      "/vendor/raw.js"
    );
    expect(context.audioWorklet.addModule).toHaveBeenNthCalledWith(
      2,
      "blob:mock-1"
    );
  });

  // Controls: the cache must still do its job for repeated identical requests.

  it("creates only one blob URL across repeated inlined loads", async () => {
    const load = await freshLoader();
    const context = createContext();

    await load(context);
    await load(context);
    await load(context);

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(context.audioWorklet.addModule).toHaveBeenCalledTimes(3);
    expect(context.audioWorklet.addModule).toHaveBeenLastCalledWith(
      "blob:mock-1"
    );
  });

  it("reuses the cached entry for a repeated identical path", async () => {
    const load = await freshLoader();
    const context = createContext();

    await load(context, "/vendor/raw.js");
    await load(context, "/vendor/raw.js");

    expect(context.audioWorklet.addModule).toHaveBeenCalledTimes(2);
    expect(context.audioWorklet.addModule).toHaveBeenNthCalledWith(
      2,
      "/vendor/raw.js"
    );
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("keeps separate entries per worklet name", async () => {
    vi.resetModules();
    const { createWorkletModuleLoader } =
      await import("./createWorkletModuleLoader.js");
    const loadRaw = createWorkletModuleLoader(
      "rawAudioProcessor",
      HASH,
      "// raw"
    );
    const loadConcat = createWorkletModuleLoader(
      "audioConcatProcessor",
      HASH,
      "// concat"
    );
    const context = createContext();

    await loadRaw(context, "/vendor/raw.js");
    await loadConcat(context, "/vendor/concat.js");

    expect(context.audioWorklet.addModule).toHaveBeenNthCalledWith(
      1,
      "/vendor/raw.js"
    );
    expect(context.audioWorklet.addModule).toHaveBeenNthCalledWith(
      2,
      "/vendor/concat.js"
    );
  });

  it("reports the requested path when loading from it fails", async () => {
    const load = await freshLoader();
    const context = createContext(
      vi.fn().mockRejectedValue(new Error("blocked by CSP"))
    );

    await expect(load(context, "/vendor/raw.js")).rejects.toThrow(
      "Failed to load the rawAudioProcessor worklet module from path: /vendor/raw.js"
    );
  });

  it("does not cache a path that failed to load", async () => {
    const load = await freshLoader();
    const failing = createContext(
      vi.fn().mockRejectedValue(new Error("blocked by CSP"))
    );
    await expect(load(failing, "/vendor/raw.js")).rejects.toThrow();

    const context = createContext();
    await load(context, "/vendor/raw.js");

    expect(context.audioWorklet.addModule).toHaveBeenCalledWith(
      "/vendor/raw.js"
    );
  });

  it("instantiates the processor under its content-hashed name", async () => {
    const load = await freshLoader();
    const context = createContext();
    const options = { processorOptions: { foo: 1 } };

    const node = await load(context, undefined, options);

    expect(AudioWorkletNode).toHaveBeenCalledWith(
      context,
      `rawAudioProcessor@${HASH}`,
      options
    );
    expect(node).toBeInstanceOf(AudioWorkletNode);
  });

  it("explains a self-hosted worklet that registers a different processor name", async () => {
    const load = await freshLoader();
    const context = createContext();
    const notRegistered = new DOMException(
      "The node name is not defined in AudioWorkletGlobalScope.",
      "InvalidStateError"
    );
    vi.mocked(AudioWorkletNode).mockImplementationOnce(function () {
      throw notRegistered;
    });

    const result = load(context, "/vendor/raw.js");

    await expect(result).rejects.toThrow(
      `The rawAudioProcessor worklet loaded from /vendor/raw.js does not match this version of @elevenlabs/client: it did not register the "rawAudioProcessor@${HASH}" processor.`
    );
    await expect(result).rejects.toMatchObject({ cause: notRegistered });
  });

  it("rethrows node creation errors unchanged for the inlined worklet", async () => {
    const load = await freshLoader();
    const context = createContext();
    const failure = new Error("node creation failed");
    vi.mocked(AudioWorkletNode).mockImplementationOnce(function () {
      throw failure;
    });

    await expect(load(context)).rejects.toBe(failure);
  });
});
