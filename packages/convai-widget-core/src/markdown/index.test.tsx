import { render } from "preact";
import { afterEach, describe, expect, it } from "vitest";
import { WidgetStreamdown } from ".";

const linkConfig = {
  allowedHosts: ["example.com"],
  includeWww: true,
  allowHttp: false,
};

describe("WidgetStreamdown", () => {
  const container = document.createElement("div");
  document.body.append(container);

  afterEach(() => render(null, container));

  it("shows the text of a partially streamed link instead of [blocked]", () => {
    for (const partial of ["See [docs](https://example.com/pa", "See [do"]) {
      render(
        <WidgetStreamdown linkConfig={linkConfig}>{partial}</WidgetStreamdown>,
        container
      );
      expect(container.textContent).not.toContain("[blocked]");
      expect(container.querySelector("a")).toBeNull();
    }

    render(
      <WidgetStreamdown linkConfig={linkConfig}>
        See [docs](https://example.com/page)
      </WidgetStreamdown>,
      container
    );
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "https://example.com/page"
    );
  });
});
