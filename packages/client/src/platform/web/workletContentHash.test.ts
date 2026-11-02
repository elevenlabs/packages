import { describe, expect, it, vi } from "vitest";

const { loaders } = vi.hoisted(() => ({
  loaders: [] as { name: string; hash: string; source: string }[],
}));
vi.mock("./createWorkletModuleLoader.js", () => ({
  createWorkletModuleLoader: (name: string, hash: string, source: string) => {
    loaders.push({ name, hash, source });
    return async () => {};
  },
}));
await import("./rawAudioProcessor.generated.js");
await import("./audioConcatProcessor.generated.js");
await import("./scribeAudioProcessor.generated.js");

function registeredNames(source: string) {
  const names: string[] = [];
  new Function("AudioWorkletProcessor", "registerProcessor", source)(
    class {},
    (name: string) => names.push(name)
  );
  return names;
}

describe.each(loaders)("the $name worklet", ({ name, hash, source }) => {
  it("registers the content-hashed name the client instantiates", () => {
    expect(registeredNames(source)).toEqual([`${name}@${hash}`]);
  });

  it("is hashed over its own content", async () => {
    const unhashed = source.replace(
      `registerProcessor("${name}@${hash}"`,
      `registerProcessor("${name}"`
    );
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(unhashed)
    );
    const expected = Array.from(new Uint8Array(digest), byte =>
      byte.toString(16).padStart(2, "0")
    )
      .join("")
      .slice(0, 16);

    expect(hash).toBe(expected);
  });
});
