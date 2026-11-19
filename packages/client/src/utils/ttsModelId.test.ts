import { describe, expect, expectTypeOf, it } from "vitest";
import ts from "typescript";

import type { BaseSessionConfig } from "./BaseConnection.js";

type TtsOverrides = NonNullable<
  NonNullable<BaseSessionConfig["overrides"]>["tts"]
>;
type ModelIdOption = TtsOverrides["modelId"];

const DOCUMENTED_MODEL_IDS = [
  "eleven_turbo_v2",
  "eleven_turbo_v2_5",
  "eleven_flash_v2",
  "eleven_flash_v2_5",
  "eleven_multilingual_v2",
  "eleven_v3_conversational",
  "eleven_v4",
  "eleven_v4_turbo",
] as const;

describe("overrides.tts.modelId typing", () => {
  it("accepts documented model ids, other strings and omission", () => {
    expectTypeOf<"eleven_v3_conversational">().toExtend<ModelIdOption>();
    expectTypeOf<"eleven_v4_turbo">().toExtend<ModelIdOption>();
    expectTypeOf<"some_unknown_model">().toExtend<ModelIdOption>();
    expectTypeOf<undefined>().toExtend<ModelIdOption>();

    const known: BaseSessionConfig["overrides"] = {
      tts: { modelId: "eleven_v3_conversational" },
    };
    const unknown: BaseSessionConfig["overrides"] = {
      tts: { modelId: "some_unknown_model" },
    };
    const omitted: BaseSessionConfig["overrides"] = {
      tts: { voiceId: "voice_123" },
    };
    expect([known, unknown, omitted]).toHaveLength(3);
  });

  it("rejects non-string model ids", () => {
    const invalid: BaseSessionConfig["overrides"] = {
      // @ts-expect-error modelId must be a string
      tts: { modelId: 123 },
    };
    expect(invalid).toBeDefined();
  });

  it("keeps the documented ids as distinct literals (not collapsed to string)", () => {
    // If the union collapsed to `string`, `Extract` would yield `never` and the
    // editor would stop suggesting the documented ids.
    expectTypeOf<
      Extract<ModelIdOption, "eleven_v3_conversational">
    >().toEqualTypeOf<"eleven_v3_conversational">();
    expectTypeOf<
      Extract<ModelIdOption, "eleven_v4">
    >().toEqualTypeOf<"eleven_v4">();
  });
});

describe("overrides.tts.modelId in the TypeScript language service", () => {
  const dir = new URL(".", import.meta.url).pathname.replace(/\/$/, "");
  const clientRoot = new URL("../..", import.meta.url).pathname.replace(
    /\/$/,
    ""
  );
  const file = `${dir}/__ttsModelIdScratch.ts`;

  function analyze(modelIdExpression: string | null) {
    const property =
      modelIdExpression === null
        ? 'voiceId: "voice_123"'
        : `modelId: ${modelIdExpression}`;
    const text = [
      'import type { BaseSessionConfig } from "./BaseConnection.js";',
      `export const config: BaseSessionConfig["overrides"] = { tts: { ${property} } };`,
      "",
    ].join("\n");

    const options: ts.CompilerOptions = {
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: [],
      target: ts.ScriptTarget.ES2022,
      lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
    };
    const service = ts.createLanguageService({
      getScriptFileNames: () => [file],
      getScriptVersion: () => "1",
      getScriptSnapshot: name => {
        if (name === file) return ts.ScriptSnapshot.fromString(text);
        const contents = ts.sys.readFile(name);
        return contents === undefined
          ? undefined
          : ts.ScriptSnapshot.fromString(contents);
      },
      getCurrentDirectory: () => clientRoot,
      getCompilationSettings: () => options,
      getDefaultLibFileName: o => ts.getDefaultLibFilePath(o),
      fileExists: ts.sys.fileExists,
      readFile: ts.sys.readFile,
      readDirectory: ts.sys.readDirectory,
      directoryExists: ts.sys.directoryExists,
      getDirectories: ts.sys.getDirectories,
    });
    const errors = service
      .getSemanticDiagnostics(file)
      .map(d => ts.flattenDiagnosticMessageText(d.messageText, "\n"));
    return { service, text, errors };
  }

  it.each<[string | null, string]>([
    ['"eleven_v3_conversational"', "documented id"],
    ['"some_unknown_model"', "arbitrary string"],
    [null, "omitted"],
  ])("compiles %s (%s)", expression => {
    expect(analyze(expression).errors).toEqual([]);
  });

  it("reports a compile error for a non-string model id", () => {
    expect(analyze("123").errors).not.toEqual([]);
  });

  it("suggests every documented model id when completing modelId", () => {
    const { service, text } = analyze('""');
    const position = text.indexOf('""') + 1;
    const completions = service.getCompletionsAtPosition(file, position, {});

    expect(completions?.entries.map(entry => entry.name)).toEqual(
      expect.arrayContaining([...DOCUMENTED_MODEL_IDS])
    );
  });
});
