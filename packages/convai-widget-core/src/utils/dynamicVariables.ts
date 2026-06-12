export type DynamicVariables = Record<string, string | number | boolean>;

export function parseDynamicVariables(
  json: string | undefined
): DynamicVariables | undefined {
  if (!json) {
    return undefined;
  }
  try {
    return JSON.parse(json) as DynamicVariables;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(
      `[ConversationalAI] Cannot parse dynamic-variables: ${message}`
    );
    return undefined;
  }
}

export function interpolateDynamicVariables(
  template: string,
  variables: DynamicVariables | undefined
): string {
  if (!variables) {
    return template;
  }
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (match, key: string) => {
    const value = variables[key];
    return value == null ? match : String(value);
  });
}
