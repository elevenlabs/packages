import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    name: "Browser tests",
    browser: {
      enabled: true,
      instances: [
        {
          browser: "chromium",
          provider: playwright({
            launchOptions: {
              args: [
                "--use-fake-device-for-media-stream",
                "--use-fake-ui-for-media-stream",
              ],
            },
            contextOptions: {
              permissions: ["microphone"],
            },
          }),
        },
        {
          browser: "firefox",
          headless: true,
          provider: playwright({
            launchOptions: {
              firefoxUserPrefs: {
                "permissions.default.microphone": 1,
                "media.navigator.streams.fake": true,
                "media.navigator.permission.disabled": true,
              },
            },
          }),
        },
      ],
    },
  },
});
