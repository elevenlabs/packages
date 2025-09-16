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
      "$0 variant should show dismiss button when not in call",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
          dismissible: "true",
        });

        const dismissButton = page.getByRole("button", { name: "Dismiss" });
        await expect.element(dismissButton).toBeVisible();

        await dismissButton.click();

        const widget = page.getByRole("button", { name: "Start a call" });
        await expect.element(widget).not.toBeInTheDocument();
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

        const startButton = page.getByRole("button", { name: "Start a call" });
        await startButton.click();

        const acceptButton = page.getByRole("button", { name: "Accept" });
        await acceptButton.click();

        await startButton.click();

        await expect.element(dismissButton).not.toBeInTheDocument();

        const endButton = page.getByRole("button", {
          name: "End",
          exact: true,
        });
        await endButton.click();

        await expect.element(dismissButton).toBeVisible();
      }
    );

    it("should work with expandable widget", async () => {
      setupWebComponent({
        "agent-id": "basic",
        variant: "compact",
        dismissible: "true",
        transcript: "true",
        "text-input": "true",
      });

      // Dismiss button should be visible on expandable widget
      const dismissButton = page.getByRole("button", { name: "Dismiss" });
      await expect.element(dismissButton).toBeVisible();

      // Dismissing should hide the entire widget
      await dismissButton.click();

      // Verify widget is gone
      const startButton = page.getByRole("button", { name: "Start a call" });
      await expect.element(startButton).not.toBeInTheDocument();

      // Also verify text input is gone (part of expandable widget)
      const textInput = page.getByRole("textbox", {
        name: "Text message input",
      });
      await expect.element(textInput).not.toBeInTheDocument();
    });
  });

  describe("when dismissible is disabled", () => {
    it.each(Variants)(
      "$0 variant should not show dismiss button",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
          dismissible: "false",
        });

        const dismissButton = page.getByRole("button", { name: "Dismiss" });
        await expect.element(dismissButton).not.toBeInTheDocument();
      }
    );
  });

  describe("when dismissible is not specified", () => {
    it.each(Variants)(
      "$0 variant should not show dismiss button by default",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
        });

        const dismissButton = page.getByRole("button", { name: "Dismiss" });
        await expect.element(dismissButton).not.toBeInTheDocument();
      }
    );
  });

  describe("fade out animation", () => {
    it("should fade out smoothly when dismissed", async () => {
      setupWebComponent({
        "agent-id": "basic",
        variant: "compact",
        dismissible: "true",
      });

      const dismissButton = page.getByRole("button", { name: "Dismiss" });

      // Widget should be visible
      const startButton = page.getByRole("button", { name: "Start a call" });
      await expect.element(startButton).toBeVisible();

      // Click dismiss
      await dismissButton.click();

      // Widget should fade out and be removed
      await expect.element(startButton).not.toBeInTheDocument();
    });
  });
});
