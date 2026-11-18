import { describe, expect, it } from "vitest";
import { webSessionSetup } from "./VoiceSessionSetup.js";
import {
  BaseConversation,
  type PartialOptions,
} from "../../BaseConversation.js";

abstract class OptionsFactory extends BaseConversation {
  public static getFullOptions(partialOptions: PartialOptions) {
    return super.getFullOptions(partialOptions);
  }
}

describe("webSessionSetup", () => {
  it("rejects preferredOutputDevices", async () => {
    await expect(
      webSessionSetup(
        OptionsFactory.getFullOptions({
          agentId: "agent",
          preferredOutputDevices: ["speaker"],
        })
      )
    ).rejects.toThrow("preferredOutputDevices is not supported on web");
  });
});
