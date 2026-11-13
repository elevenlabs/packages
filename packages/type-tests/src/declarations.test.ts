import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const packageDir = fileURLToPath(new URL("../", import.meta.url));
const fixturesDir = path.join(packageDir, "fixtures");
const repoRoot = path.resolve(packageDir, "../..");

type Environment = {
  name: string;
  dom: boolean;
  types: string[];
  fixtures: string[];
};

const environments: Environment[] = [
  { name: "without DOM", dom: false, types: [], fixtures: ["common.ts"] },
  {
    name: "with Node types, without DOM",
    dom: false,
    types: ["node"],
    fixtures: ["common.ts"],
  },
  {
    name: "with DOM",
    dom: true,
    types: [],
    fixtures: ["common.ts", "dom.ts"],
  },
];

function createConsumerProgram(
  options: Environment & { skipLibCheck: boolean }
): ts.Program {
  return ts.createProgram(
    options.fixtures.map(fixture => path.join(fixturesDir, fixture)),
    {
      noEmit: true,
      strict: true,
      skipLibCheck: options.skipLibCheck,
      target: ts.ScriptTarget.ES2022,
      lib: options.dom
        ? ["lib.es2022.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"]
        : ["lib.es2022.d.ts"],
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      types: options.types,
      typeRoots: [path.join(packageDir, "node_modules/@types")],
    }
  );
}

// Workspace packages resolve to their real paths outside node_modules, so this
// separates the SDK's declarations and the fixtures from third-party ones.
// Third-party declarations reachable from the public API (livekit-client, via
// `WebRTCConnection.getRoom()`) assume the DOM lib and are outside our control.
function isOwnFile(fileName: string): boolean {
  return !fileName.split(/[\\/]/).includes("node_modules");
}

function isDomLib(sourceFile: ts.SourceFile): boolean {
  return /^lib\.dom\b/.test(path.basename(sourceFile.fileName));
}

function describeLocation(sourceFile: ts.SourceFile, position: number): string {
  const { line } = sourceFile.getLineAndCharacterOfPosition(position);
  return `${path.relative(repoRoot, sourceFile.fileName)}:${line + 1}`;
}

function formatDiagnostic(diagnostic: ts.Diagnostic): string {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
  if (!diagnostic.file || diagnostic.start === undefined) return message;
  return `${describeLocation(diagnostic.file, diagnostic.start)} ${message}`;
}

describe.each(environments)("consumer $name", environment => {
  it.each([true, false])("type-checks with skipLibCheck: %s", skipLibCheck => {
    const program = createConsumerProgram({ ...environment, skipLibCheck });

    expect(program.getSourceFiles().some(isDomLib)).toBe(environment.dom);
    expect(
      ts
        .getPreEmitDiagnostics(program)
        .filter(
          diagnostic => !diagnostic.file || isOwnFile(diagnostic.file.fileName)
        )
        .map(formatDiagnostic)
    ).toEqual([]);
  });
});

it("published declarations do not reference DOM lib types", () => {
  const program = createConsumerProgram({
    name: "with DOM",
    dom: true,
    types: [],
    fixtures: ["common.ts"],
    skipLibCheck: true,
  });
  const checker = program.getTypeChecker();
  const references: string[] = [];

  const isDomDeclaration = (declaration: ts.Declaration) => {
    const sourceFile = declaration.getSourceFile();
    return (
      program.isSourceFileDefaultLibrary(sourceFile) && isDomLib(sourceFile)
    );
  };

  for (const sourceFile of program.getSourceFiles()) {
    if (!sourceFile.isDeclarationFile || !isOwnFile(sourceFile.fileName)) {
      continue;
    }
    const visit = (node: ts.Node) => {
      let name: ts.EntityName | ts.Expression | undefined;
      if (ts.isTypeReferenceNode(node)) name = node.typeName;
      else if (ts.isTypeQueryNode(node)) name = node.exprName;
      else if (ts.isExpressionWithTypeArguments(node)) name = node.expression;

      if (name) {
        const root = ts.isQualifiedName(name) ? name.left : name;
        let symbol = checker.getSymbolAtLocation(root);
        if (symbol && symbol.flags & ts.SymbolFlags.Alias) {
          symbol = checker.getAliasedSymbol(symbol);
        }
        if (symbol?.declarations?.some(isDomDeclaration)) {
          references.push(
            `${describeLocation(sourceFile, node.getStart())} ${name.getText()}`
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sourceFile);
  }

  expect(references).toEqual([]);
});
