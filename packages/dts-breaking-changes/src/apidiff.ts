import ts from "typescript";

import type { ApiChange } from "./types.ts";

const FMT = ts.TypeFormatFlags.NoTruncation;

/** `export type { X }` / `export { type X }` re-exports are not value exports. */
function isTypeOnlyExport(sym: ts.Symbol): boolean {
  for (const decl of sym.getDeclarations() ?? []) {
    if (!ts.isExportSpecifier(decl)) continue;
    if (decl.isTypeOnly) return true;
    const clause = decl.parent.parent;
    if (ts.isExportDeclaration(clause) && clause.isTypeOnly) return true;
  }
  return false;
}

function resolveAlias(checker: ts.TypeChecker, sym: ts.Symbol): ts.Symbol {
  return sym.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(sym) : sym;
}

/** The type representing a value export — the instance type for a class. */
function exportType(
  checker: ts.TypeChecker,
  sym: ts.Symbol,
  loc: ts.Node
): ts.Type {
  const resolved = resolveAlias(checker, sym);
  if (resolved.flags & ts.SymbolFlags.Class) {
    return checker.getDeclaredTypeOfSymbol(resolved);
  }
  return checker.getTypeOfSymbolAtLocation(resolved, loc);
}

function memberType(
  checker: ts.TypeChecker,
  sym: ts.Symbol,
  loc: ts.Node
): ts.Type {
  return checker.getTypeOfSymbolAtLocation(sym, sym.valueDeclaration ?? loc);
}

function sig(checker: ts.TypeChecker, type: ts.Type): string {
  return checker.typeToString(type, undefined, FMT).replace(/\s+/g, " ");
}

interface ModuleExports {
  symbols: Map<string, ts.Symbol>;
  loc: ts.Node;
}

function moduleValueExports(
  checker: ts.TypeChecker,
  program: ts.Program,
  entryAbs: string
): ModuleExports | undefined {
  const source = program.getSourceFile(entryAbs);
  if (!source) return undefined;
  const moduleSymbol = checker.getSymbolAtLocation(source);
  if (!moduleSymbol) return undefined;
  const symbols = new Map<string, ts.Symbol>();
  for (const sym of checker.getExportsOfModule(moduleSymbol)) {
    if (isTypeOnlyExport(sym)) continue;
    if ((resolveAlias(checker, sym).flags & ts.SymbolFlags.Value) === 0)
      continue;
    symbols.set(sym.getName(), sym);
  }
  return { symbols, loc: source };
}

function propertyMap(type: ts.Type): Map<string, ts.Symbol> {
  return new Map(type.getProperties().map(s => [s.getName(), s]));
}

/** Enumerate member-level changes between two types, recursing into changed containers. */
function diffMembers(
  path: string,
  oldType: ts.Type,
  newType: ts.Type,
  checker: ts.TypeChecker,
  loc: ts.Node,
  out: ApiChange[],
  depth: number
): void {
  const oldProps = propertyMap(oldType);
  const newProps = propertyMap(newType);

  for (const [name, sym] of newProps) {
    if (oldProps.has(name)) continue;
    out.push({
      kind: "add",
      path: `${path}.${name}`,
      signature: sig(checker, memberType(checker, sym, loc)),
    });
  }
  for (const name of oldProps.keys()) {
    if (!newProps.has(name))
      out.push({ kind: "remove", path: `${path}.${name}` });
  }
  for (const [name, newSym] of newProps) {
    const oldSym = oldProps.get(name);
    if (!oldSym) continue;
    const oldT = memberType(checker, oldSym, loc);
    const newT = memberType(checker, newSym, loc);
    const newStr = sig(checker, newT);
    if (sig(checker, oldT) === newStr) continue;
    if (
      depth > 0 &&
      oldT.getProperties().length > 0 &&
      newT.getProperties().length > 0
    ) {
      diffMembers(`${path}.${name}`, oldT, newT, checker, loc, out, depth - 1);
    } else {
      out.push({
        kind: "change",
        path: `${path}.${name}`,
        signature: newStr,
        from: sig(checker, oldT),
      });
    }
  }
}

/**
 * Enumerate structural additions/removals/changes to a package's value surface
 * — a review aid, not a correctness check. Walks the two module types one level
 * of members deep (recursing only into members whose type changed), so it stays
 * bounded and complements the assignability gate rather than reimplementing it.
 */
export function diffApi(
  program: ts.Program,
  oldEntry: string,
  newEntry: string
): ApiChange[] {
  const checker = program.getTypeChecker();
  const oldMod = moduleValueExports(checker, program, oldEntry);
  const newMod = moduleValueExports(checker, program, newEntry);
  if (!oldMod || !newMod) return [];

  const out: ApiChange[] = [];
  for (const [name, sym] of newMod.symbols) {
    if (oldMod.symbols.has(name)) continue;
    out.push({
      kind: "add",
      path: name,
      signature: sig(checker, exportType(checker, sym, newMod.loc)),
    });
  }
  for (const name of oldMod.symbols.keys()) {
    if (!newMod.symbols.has(name)) out.push({ kind: "remove", path: name });
  }
  for (const [name, newSym] of newMod.symbols) {
    const oldSym = oldMod.symbols.get(name);
    if (!oldSym) continue;
    const oldT = exportType(checker, oldSym, oldMod.loc);
    const newT = exportType(checker, newSym, newMod.loc);
    // A class/interface instance type prints as its nominal name, so compare its
    // members structurally rather than by type string.
    if (oldT.getProperties().length > 0 || newT.getProperties().length > 0) {
      diffMembers(name, oldT, newT, checker, newMod.loc, out, 1);
    } else if (sig(checker, oldT) !== sig(checker, newT)) {
      out.push({
        kind: "change",
        path: name,
        signature: sig(checker, newT),
        from: sig(checker, oldT),
      });
    }
  }
  return out;
}
