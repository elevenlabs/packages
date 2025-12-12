function maybeParseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function allowedDomainsToLinkPrefixes(
  domains?: string[] | null
): string[] {
  if (!domains || domains.length === 0) {
    return [];
  }

  if (domains.includes("*")) {
    return ["*"];
  }

  const candidates = new Set<string>();

  for (const raw of domains) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    if (maybeParseUrl(trimmed)) {
      candidates.add(trimmed);
      continue;
    }

    const domain = trimmed.replace(/\.$/, "");

    candidates.add(`https://${domain}`);
    candidates.add(`http://${domain}`);
    if (!domain.startsWith("www.")) {
      candidates.add(`https://www.${domain}`);
      candidates.add(`http://www.${domain}`);
    }
  }

  return [...candidates].filter(url => maybeParseUrl(url));
}
