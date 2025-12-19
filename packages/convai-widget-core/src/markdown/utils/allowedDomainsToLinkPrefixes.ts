import type { MarkdownLinkConfig } from "../../contexts/widget-config";

function isFullUrl(value: string): boolean {
  return value.startsWith("https://") || value.startsWith("http://");
}

export function allowedDomainsToLinkPrefixes(
  config: MarkdownLinkConfig
): string[] {
  const { allowedHosts, includeWww, allowHttp } = config;

  if (allowedHosts.length === 0) {
    return [];
  }

  if (allowedHosts.includes("*")) {
    return ["*"];
  }

  const candidates = new Set<string>();

  for (const raw of allowedHosts) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (isFullUrl(trimmed)) {
      candidates.add(trimmed);
      continue;
    }

    const domain = trimmed.replace(/\.$/, "");

    candidates.add(`https://${domain}`);
    if (allowHttp) {
      candidates.add(`http://${domain}`);
    }
    if (includeWww && !domain.startsWith("www.")) {
      candidates.add(`https://www.${domain}`);
      if (allowHttp) {
        candidates.add(`http://www.${domain}`);
      }
    }
  }

  return [...candidates];
}
