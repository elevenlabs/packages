import { describe, expect, it } from "vitest";
import { allowedDomainsToLinkPrefixes } from "./allowedDomainsToLinkPrefixes";

describe("allowedDomainsToLinkPrefixes", () => {
  it("should default deny when missing", () => {
    expect(allowedDomainsToLinkPrefixes(undefined)).toEqual([]);
  });

  it("should default deny when empty", () => {
    expect(allowedDomainsToLinkPrefixes([])).toEqual([]);
  });

  it('should allow all when includes "*"', () => {
    expect(allowedDomainsToLinkPrefixes(["*"])).toEqual(["*"]);
  });

  it('should prefer allow-all when includes "*" and domains', () => {
    expect(allowedDomainsToLinkPrefixes(["*", "example.com"])).toEqual(["*"]);
  });

  it("should map root domains to https/http with www variants", () => {
    expect(allowedDomainsToLinkPrefixes(["example.com"])).toEqual([
      "https://example.com",
      "http://example.com",
      "https://www.example.com",
      "http://www.example.com",
    ]);
  });

  it("should not add www.www for www domains", () => {
    expect(allowedDomainsToLinkPrefixes(["www.example.com"])).toEqual([
      "https://www.example.com",
      "http://www.example.com",
    ]);
  });

  it("should strip trailing dot from FQDN and add www", () => {
    expect(allowedDomainsToLinkPrefixes(["example.com."])).toEqual([
      "https://example.com",
      "http://example.com",
      "https://www.example.com",
      "http://www.example.com",
    ]);
  });

  it("should dedupe when domain and www variant provided", () => {
    expect(
      allowedDomainsToLinkPrefixes(["example.com", "www.example.com"])
    ).toEqual([
      "https://example.com",
      "http://example.com",
      "https://www.example.com",
      "http://www.example.com",
    ]);
  });

  it("should use URL as-is when already a full URL", () => {
    expect(
      allowedDomainsToLinkPrefixes(["https://example.com/specific/path"])
    ).toEqual(["https://example.com/specific/path"]);
  });

  it("should handle mix of URLs and domains", () => {
    expect(
      allowedDomainsToLinkPrefixes(["https://trusted.com/api", "example.com"])
    ).toEqual([
      "https://trusted.com/api",
      "https://example.com",
      "http://example.com",
      "https://www.example.com",
      "http://www.example.com",
    ]);
  });

  it("should always add www for subdomains too", () => {
    expect(allowedDomainsToLinkPrefixes(["docs.elevenlabs.io"])).toEqual([
      "https://docs.elevenlabs.io",
      "http://docs.elevenlabs.io",
      "https://www.docs.elevenlabs.io",
      "http://www.docs.elevenlabs.io",
    ]);
  });

  it("should add www for .co.uk domains", () => {
    expect(allowedDomainsToLinkPrefixes(["example.co.uk"])).toEqual([
      "https://example.co.uk",
      "http://example.co.uk",
      "https://www.example.co.uk",
      "http://www.example.co.uk",
    ]);
  });

  it("should skip invalid/empty inputs", () => {
    expect(allowedDomainsToLinkPrefixes(["", "  ", "valid.com"])).toEqual([
      "https://valid.com",
      "http://valid.com",
      "https://www.valid.com",
      "http://www.valid.com",
    ]);
  });
});
