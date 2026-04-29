import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "Unit tests",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/index.test.ts", "src/utils/input.test.ts"],
        },
      },
      {
        test: {
          name: "Browser tests",
          include: ["src/index.test.ts", "src/utils/input.test.ts"],
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
            ],
          },
        },
      },
    ],
  },
});
