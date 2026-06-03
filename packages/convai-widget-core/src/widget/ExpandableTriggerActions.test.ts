import { page, userEvent } from "vitest/browser";
import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { Worker } from "../mocks/browser";
import { setupWebComponent } from "../mocks/web-component";
import { Variants } from "../types/config";

describe("Trigger entry points", () => {
  beforeAll(() => Worker.start({ quiet: true }));
  afterAll(() => Worker.stop());

  describe("which entry points show", () => {
    it.each(Variants)(
      "$0 multimodal agent shows both call and message",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
          "text-input": "true",
        });

        await expect
          .element(page.getByRole("button", { name: "Start a call" }))
          .toBeVisible();
        await expect
          .element(page.getByRole("button", { name: "Start a chat" }))
          .toBeVisible();
      }
    );

    it.each(Variants)("$0 voice-only agent shows only call", async variant => {
      setupWebComponent({
        "agent-id": "basic",
        variant,
        transcript: "true",
      });

      await expect
        .element(page.getByRole("button", { name: "Start a call" }))
        .toBeVisible();
      await expect
        .element(page.getByRole("button", { name: "Start a chat" }))
        .not.toBeInTheDocument();
    });

    it.each(Variants)(
      "$0 text-only agent shows only message",
      async variant => {
        setupWebComponent({
          "agent-id": "basic",
          variant,
          "override-text-only": "true",
        });

        await expect
          .element(page.getByRole("button", { name: "Start a chat" }))
          .toBeVisible();
        await expect
          .element(page.getByRole("button", { name: "Start a call" }))
          .not.toBeInTheDocument();
      }
    );
  });

  describe("entry point behavior", () => {
    it("message opens the sheet, focuses the input, and starts no session", async () => {
      setupWebComponent({
        "agent-id": "basic",
        variant: "compact",
        "text-input": "true",
      });

      await page.getByRole("button", { name: "Start a chat" }).click();
      await page.getByRole("button", { name: "Accept" }).click();

      const input = page.getByRole("textbox", { name: "Text message input" });
      await expect.element(input).toBeVisible();
      // Typing without clicking proves the input was focused on open
      // (toHaveFocus can't cross the widget's shadow-DOM boundary).
      await userEvent.keyboard("Hi there");
      await expect.element(input).toHaveValue("Hi there");
      // No call was started, so there is no end-call control.
      await expect
        .element(page.getByRole("button", { name: "End", exact: true }))
        .not.toBeInTheDocument();
    });

    it("call starts the session and opens the sheet", async () => {
      setupWebComponent({
        "agent-id": "basic",
        variant: "compact",
        "text-input": "true",
      });

      await page.getByRole("button", { name: "Start a call" }).click();
      await page.getByRole("button", { name: "Accept" }).click();

      await expect
        .element(page.getByRole("textbox", { name: "Text message input" }))
        .toBeVisible();
      await expect
        .element(page.getByRole("button", { name: "End", exact: true }))
        .toBeVisible();
    });
  });

  describe("language picker", () => {
    it.each(Variants)(
      "$0 keeps the language picker on the launcher when enabled",
      async variant => {
        setupWebComponent({
          "agent-id": "localized",
          variant,
          "text-input": "true",
        });

        await expect
          .element(page.getByRole("combobox", { name: "Change language" }))
          .toBeVisible();
      }
    );

    it("opens the dropdown without expanding the widget", async () => {
      setupWebComponent({
        "agent-id": "localized",
        variant: "compact",
        "text-input": "true",
      });

      await page.getByRole("combobox", { name: "Change language" }).click();

      // The sheet must stay collapsed: no text input, entry points still shown.
      await expect
        .element(page.getByRole("textbox", { name: "Text message input" }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole("button", { name: "Start a call" }))
        .toBeVisible();
    });
  });
});
