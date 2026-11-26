import ts from "typescript";
import { describe, expect, it } from "vitest";

describe("Scribe declarations", () => {
  it.each(["scribe", "microphone"])(
    "%s compiles without the SDK's ambient runtime declarations",
    module => {
      const declaration = ts.sys.resolvePath(`dist/scribe/${module}.d.ts`);
      const program = ts.createProgram([declaration], {
        noEmit: true,
        strict: true,
        skipLibCheck: false,
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.NodeNext,
        moduleResolution: ts.ModuleResolutionKind.NodeNext,
        lib: ["lib.es2022.d.ts", "lib.dom.d.ts"],
        types: [],
      });

      expect(
        ts
          .getPreEmitDiagnostics(program)
          .map(diagnostic =>
            ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
          )
      ).toEqual([]);
    }
  );
});
