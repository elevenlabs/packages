import { describe, expect, it } from "vitest";
import { allowedDomainsToLinkPrefixes } from "./allowedDomainsToLinkPrefixes";
import type { MarkdownLinkConfig } from "../../contexts/widget-config";

/** Helper to create a config with just allowedHosts (uses defaults for other options) */
function config(
  allowedHosts: string[],
  overrides?: Partial<MarkdownLinkConfig>
): MarkdownLinkConfig {
  return {
    allowedHosts,
    includeWww: true,
    allowHttp: true,
    ...overrides,
  };
}

describe("allowedDomainsToLinkPrefixes", () => {
  describe("edge cases", () => {
    it.each([
      { input: [], expected: [], description: "empty array" },
      { input: ["*"], expected: ["*"], description: 'wildcard "*"' },
      {
        input: ["*", "example.com"],
        expected: ["*"],
        description: 'wildcard with other domains (prefers "*")',
      },
      {
        input: ["", "  ", "valid.com"],
        expected: [
          "https://valid.com",
          "http://valid.com",
          "https://www.valid.com",
          "http://www.valid.com",
        ],
        description: "empty/whitespace inputs are skipped",
      },
    ])("$description", ({ input, expected }) => {
      expect(allowedDomainsToLinkPrefixes(config(input))).toEqual(expected);
    });
  });

  describe("domain to URL expansion", () => {
    it.each([
      {
        input: ["example.com"],
        expected: [
          "https://example.com",
          "http://example.com",
          "https://www.example.com",
          "http://www.example.com",
        ],
        description: "root domain",
      },
      {
        input: ["www.example.com"],
        expected: ["https://www.example.com", "http://www.example.com"],
        description: "www domain (no www.www duplication)",
      },
      {
        input: ["example.com."],
        expected: [
          "https://example.com",
          "http://example.com",
          "https://www.example.com",
          "http://www.example.com",
        ],
        description: "FQDN with trailing dot",
      },
      {
        input: ["docs.elevenlabs.io"],
        expected: [
          "https://docs.elevenlabs.io",
          "http://docs.elevenlabs.io",
          "https://www.docs.elevenlabs.io",
          "http://www.docs.elevenlabs.io",
        ],
        description: "subdomain",
      },
      {
        input: ["example.co.uk"],
        expected: [
          "https://example.co.uk",
          "http://example.co.uk",
          "https://www.example.co.uk",
          "http://www.example.co.uk",
        ],
        description: "multi-part TLD (.co.uk)",
      },
      {
        input: ["localhost"],
        expected: [
          "https://localhost",
          "http://localhost",
          "https://www.localhost",
          "http://www.localhost",
        ],
        description: "localhost without port",
      },
      {
        input: ["localhost:3000"],
        expected: [
          "https://localhost:3000",
          "http://localhost:3000",
          "https://www.localhost:3000",
          "http://www.localhost:3000",
        ],
        description: "localhost with port",
      },
      {
        input: ["example.com/"],
        expected: [
          "https://example.com/",
          "http://example.com/",
          "https://www.example.com/",
          "http://www.example.com/",
        ],
        description: "domain with trailing slash",
      },
    ])("$description", ({ input, expected }) => {
      expect(allowedDomainsToLinkPrefixes(config(input))).toEqual(expected);
    });
  });

  describe("full URLs (passed through as-is)", () => {
    it.each([
      {
        input: ["https://example.com/specific/path"],
        expected: ["https://example.com/specific/path"],
        description: "https URL with path",
      },
      {
        input: ["http://localhost:3000"],
        expected: ["http://localhost:3000"],
        description: "http localhost with port",
      },
      {
        input: ["https://example.com/"],
        expected: ["https://example.com/"],
        description: "https URL with trailing slash",
      },
    ])("$description", ({ input, expected }) => {
      expect(allowedDomainsToLinkPrefixes(config(input))).toEqual(expected);
    });
  });

  describe("mixed inputs", () => {
    it.each([
      {
        input: ["example.com", "www.example.com"],
        expected: [
          "https://example.com",
          "http://example.com",
          "https://www.example.com",
          "http://www.example.com",
        ],
        description: "domain and www variant (deduped)",
      },
      {
        input: ["https://trusted.com/api", "example.com"],
        expected: [
          "https://trusted.com/api",
          "https://example.com",
          "http://example.com",
          "https://www.example.com",
          "http://www.example.com",
        ],
        description: "full URL and domain",
      },
    ])("$description", ({ input, expected }) => {
      expect(allowedDomainsToLinkPrefixes(config(input))).toEqual(expected);
    });
  });

  describe("with options", () => {
    it.each<{
      input: string[];
      overrides: Partial<MarkdownLinkConfig>;
      expected: string[];
      description: string;
    }>([
      {
        input: ["example.com"],
        overrides: { allowHttp: false },
        expected: ["https://example.com", "https://www.example.com"],
        description: "allowHttp: false - https only",
      },
      {
        input: ["example.com"],
        overrides: { includeWww: false },
        expected: ["https://example.com", "http://example.com"],
        description: "includeWww: false - no www variants",
      },
      {
        input: ["example.com"],
        overrides: { includeWww: false, allowHttp: false },
        expected: ["https://example.com"],
        description: "both false - https only, no www",
      },
      {
        input: ["www.example.com"],
        overrides: { allowHttp: false },
        expected: ["https://www.example.com"],
        description: "www domain with allowHttp: false",
      },
      {
        input: ["http://example.com/path"],
        overrides: { allowHttp: false, includeWww: false },
        expected: ["http://example.com/path"],
        description: "full URL preserved regardless of options",
      },
    ])("$description", ({ input, overrides, expected }) => {
      expect(allowedDomainsToLinkPrefixes(config(input, overrides))).toEqual(
        expected
      );
    });

    it("should handle mixed domains with options", () => {
      const result = allowedDomainsToLinkPrefixes(
        config(["example.com", "https://trusted.com/api"], { allowHttp: false })
      );
      expect(result).toHaveLength(3);
      expect(result).toContain("https://trusted.com/api");
      expect(result).toContain("https://example.com");
      expect(result).toContain("https://www.example.com");
    });
  });
});
