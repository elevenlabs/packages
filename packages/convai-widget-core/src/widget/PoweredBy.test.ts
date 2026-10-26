import { page, userEvent } from "vitest/browser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { h, Fragment, render } from "preact";
import { Style } from "../styles/Style";
import { PoweredBy } from "./PoweredBy";

vi.mock("../contexts/widget-config", () => ({
  useWidgetConfig: () => ({
    value: { disable_banner: false, placement: "bottom-right" },
  }),
}));

function contrast(element: HTMLElement, background: number[]) {
  const style = getComputedStyle(element);
  const foreground = style.color
    .match(/[\d.]+/g)!
    .slice(0, 3)
    .map(Number);
  const opacity = Number(style.opacity);
  const painted = foreground.map(
    (value, i) => value * opacity + background[i] * (1 - opacity)
  );
  const luminance = (rgb: number[]) =>
    rgb
      .map(value => {
        const channel = value / 255;
        return channel <= 0.04045
          ? channel / 12.92
          : ((channel + 0.055) / 1.055) ** 2.4;
      })
      .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
  const values = [luminance(painted), luminance(background)].sort(
    (a, b) => b - a
  );
  return (values[0] + 0.05) / (values[1] + 0.05);
}

let host: HTMLElement | undefined;
const originalBackground = document.body.style.backgroundColor;
afterEach(() => {
  if (host?.shadowRoot) render(null, host.shadowRoot);
  host?.remove();
  document.body.style.backgroundColor = originalBackground;
});

describe("Powered by attribution", () => {
  it.each([
    { width: 390, height: 844, background: [255, 253, 248] },
    { width: 1440, height: 1000, background: [244, 235, 208] },
  ])(
    "retains readable branding and keyboard focus at $width px",
    async ({ width, height, background }) => {
      await page.viewport(width, height);
      document.body.style.backgroundColor = `rgb(${background.join(",")})`;
      host = document.createElement("div");
      document.body.appendChild(host);
      const shadow = host.attachShadow({ mode: "open" });
      render(h(Fragment, null, h(Style, {}), h(PoweredBy, {})), shadow);
      const branding = page.getByRole("link", { name: "ElevenAgents" });
      await expect.element(branding).toBeVisible();
      const link = shadow.querySelector<HTMLAnchorElement>("a")!;
      const label = shadow.querySelector<HTMLElement>("span")!;
      expect(label.textContent).toBe("Powered by");
      expect(link.href).toBe("https://elevenlabs.io/agents");
      expect(link.target).toBe("_blank");
      expect(contrast(label, background)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(link, background)).toBeGreaterThanOrEqual(4.5);
      await branding.hover();
      expect(contrast(link, background)).toBeGreaterThanOrEqual(4.5);
      link.focus();
      await userEvent.keyboard("{ArrowRight}");
      expect(link.matches(":focus-visible")).toBe(true);
      expect(getComputedStyle(link).boxShadow).not.toBe("none");
      expect(contrast(link, background)).toBeGreaterThanOrEqual(4.5);
      await userEvent.tab();
      expect(shadow.activeElement).not.toBe(link);
    }
  );
});
