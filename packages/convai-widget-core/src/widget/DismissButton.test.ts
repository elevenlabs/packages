import { page } from "@vitest/browser/context";
import { describe, it, beforeAll, expect, afterAll } from "vitest";
import { Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";
import { Variants } from "../types/config";

describe("Dismiss Button", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  describe("when dismissible is enabled", () => {
    it.each(Variants)(
      "$0 variant should show dismiss button, hide widget on click, and show orb",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
          dismissible: "true",
        });

        // Dismiss button should be visible
        const dismissButton = page.getByRole("button", { name: "Dismiss" });
        await expect.element(dismissButton).toBeVisible();

        // Clicking dismiss should hide widget and show orb
        await dismissButton.click();

        const startButton = page.getByRole("button", { name: "Start a call" });
        await expect.element(startButton).not.toBeInTheDocument();

        const expandButton = page.getByRole("button", { name: "Open chat" });
        await expect.element(expandButton).toBeVisible();
      }
    );

    it.each(Variants)(
      "$0 variant should restore widget when clicking orb",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
          dismissible: "true",
        });

        // Dismiss the widget
        const dismissButton = page.getByRole("button", { name: "Dismiss" });
        await dismissButton.click();

        // Click the orb to restore
        const expandButton = page.getByRole("button", { name: "Open chat" });
        await expandButton.click();

        // Widget should be restored
        const startButton = page.getByRole("button", { name: "Start a call" });
        await expect.element(startButton).toBeVisible();
        await expect.element(dismissButton).toBeVisible();
      }
    );

    it.each(Variants)(
      "$0 variant should hide dismiss button during active call",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
          dismissible: "true",
          transcript: "true",
        });

        const dismissButton = page.getByRole("button", { name: "Dismiss" });
        await expect.element(dismissButton).toBeVisible();

        // Start a call
        const startButton = page.getByRole("button", { name: "Start a call" });
        await startButton.click();

        const acceptButton = page.getByRole("button", { name: "Accept" });
        await acceptButton.click();

        await startButton.click();

        // Dismiss button should be hidden during call
        await expect.element(dismissButton).not.toBeInTheDocument();

        // End call - dismiss button should reappear
        const endButton = page.getByRole("button", {
          name: "End",
          exact: true,
        });
        await endButton.click();

        await expect.element(dismissButton).toBeVisible();
      }
    );

    it("expandable widget should hide all elements when dismissed", async () => {
      setupWebComponent({
        "agent-id": "basic",
        variant: "compact",
        dismissible: "true",
        transcript: "true",
        "text-input": "true",
      });

      const dismissButton = page.getByRole("button", { name: "Dismiss" });
      await dismissButton.click();

      // Both widget and expandable elements should be gone
      await expect
        .element(page.getByRole("button", { name: "Start a call" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("textbox", { name: "Text message input" }))
        .not.toBeInTheDocument();

      // Orb should be visible
      await expect
        .element(page.getByRole("button", { name: "Open chat" }))
        .toBeVisible();
    });
  });

  describe("when dismissible is disabled", () => {
    it.each(Variants)(
      "$0 variant should not show dismiss button or orb",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
          dismissible: "false",
        });

        await expect
          .element(page.getByRole("button", { name: "Dismiss" }))
          .not.toBeInTheDocument();
        await expect
          .element(page.getByRole("button", { name: "Open chat" }))
          .not.toBeInTheDocument();
      }
    );
  });

  describe("when dismissible is not specified (opt-in behavior)", () => {
    it.each(Variants)(
      "$0 variant should not show dismiss button by default",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
        });

        await expect
          .element(page.getByRole("button", { name: "Dismiss" }))
          .not.toBeInTheDocument();
      }
    );
  });
});
