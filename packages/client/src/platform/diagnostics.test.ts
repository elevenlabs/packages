import { describe, it, expect, vi } from "vitest";

vi.mock("livekit-client", () => ({
  Room: vi.fn(),
  RoomEvent: {},
  Track: { Kind: { Audio: "audio" }, Source: { Microphone: "microphone" } },
  ConnectionState: {},
  createLocalAudioTrack: vi.fn(),
}));

// The hint is module-level state with no reset, so each case works against a
// freshly imported copy of the module.
async function freshModule() {
  vi.resetModules();
  return import("./diagnostics.js");
}

describe("missingRegistrationError", () => {
  it("names the subject and the default entry point", async () => {
    const { missingRegistrationError } = await freshModule();

    expect(missingRegistrationError("widget factory").message).toBe(
      'No widget factory registered. Import the platform-specific entry point (e.g. @elevenlabs/client via the "browser" export).'
    );
  });

  it("uses an injected hint instead", async () => {
    const { missingRegistrationError, setPlatformSetupHint } =
      await freshModule();
    setPlatformSetupHint("Do the platform-specific thing.");

    expect(missingRegistrationError("widget factory").message).toBe(
      "No widget factory registered. Do the platform-specific thing."
    );
  });
});

describe("the React Native entry point", () => {
  it("points at @elevenlabs/react-native", async () => {
    vi.resetModules();
    await import("./react-native/index.js");
    const { missingRegistrationError } = await import("./diagnostics.js");

    expect(missingRegistrationError("voice session setup strategy").message)
      .toMatchInlineSnapshot(`
        "No voice session setup strategy registered. It looks like you're using @elevenlabs/client in React Native without importing @elevenlabs/react-native. Add \`import "@elevenlabs/react-native";\` before any other ElevenLabs imports."
      `);
  });
});
