import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { TypeScriptGenerator } from "@asyncapi/modelina";
import * as AsyncAPIParser from "@asyncapi/parser";

type Role = "client" | "server";
type Dir = "incoming" | "outgoing";

const args = process.argv.slice(2);
const roleArg = (
  args.find(a => a.startsWith("--role=")) || "--role=client"
).split("=")[1] as Role;
const role: Role = roleArg === "server" ? "server" : "client";

const asyncapiPath = path.resolve(process.cwd(), "schemas/agent.asyncapi.yaml");
const outDir = path.resolve(process.cwd(), "generated/types");
const outTypesPath = path.join(outDir, "asyncapi-types.ts");
const outIncomingPath = path.join(outDir, "incoming.ts");
const outOutgoingPath = path.join(outDir, "outgoing.ts");

function opKindToDir(op: "publish" | "subscribe", r: Role): Dir {
  return r === "client"
    ? op === "publish"
      ? "incoming"
      : "outgoing"
    : op === "publish"
      ? "outgoing"
      : "incoming";
}

// Parser normalization (works fine with @asyncapi/parser 3.4.x)
async function parseAsyncAPIDoc(raw: string): Promise<any> {
  const parser = new (AsyncAPIParser as any).Parser();
  const res = await parser.parse(raw);
  return res?.document ?? res;
}

type PayloadItem = {
  baseName: string;
  schema: any;
  dir?: Dir;
};

async function collectPayloads(raw: string): Promise<PayloadItem[]> {
  const doc = await parseAsyncAPIDoc(raw);
  const json = typeof doc?.json === "function" ? doc.json() : doc;

  const seen = new Set<string>();
  const items: PayloadItem[] = [];

  // A) components.messages
  const cm = json?.components?.messages ?? {};
  for (const [msgName, message] of Object.entries<any>(cm)) {
    const payload = (message as any)?.payload;
    if (!payload) continue;
    const key = `c:${msgName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push({ baseName: msgName, schema: { ...payload, $id: msgName } });
  }

  // B) channels: publish & subscribe (handle oneOf)
  const channels = json?.channels ?? {};
  for (const [chName, ch] of Object.entries<any>(channels)) {
    for (const opKind of ["publish", "subscribe"] as const) {
      const op = (ch as any)[opKind];
      if (!op?.message) continue;

      const rawMsg = op.message;
      const list = Array.isArray(rawMsg?.oneOf) ? rawMsg.oneOf : [rawMsg];

      for (const m of list) {
        const payload = m?.payload;
        if (!payload) continue;

        const base =
          m?.name ||
          (m?.$ref && String(m.$ref).split("/").pop()) ||
          `${chName}-${opKind}`;

        const key = `o:${chName}:${opKind}:${base}`;
        if (seen.has(key)) continue;
        seen.add(key);

        items.push({
          baseName: base,
          schema: { ...payload, $id: base },
          dir: opKindToDir(opKind, role),
        });
      }
    }
  }

  return items;
}

async function main() {
  mkdirSync(outDir, { recursive: true });
  const raw = readFileSync(asyncapiPath, "utf8");

  const generator = new TypeScriptGenerator({
    modelType: "interface",
    enumType: "union",
    mapType: "record",
    rawPropertyNames: true,
    processorOptions: {
      interpreter: {
        ignoreAdditionalProperties: true,
      },
    },
  });

  const payloads = await collectPayloads(raw);

  // Deduplicate across all payloads by modelName
  const emitted = new Set<string>();
  const pieces: string[] = [];
  const incomingNames = new Set<string>();
  const outgoingNames = new Set<string>();

  for (const { schema, dir } of payloads) {
    const models = await generator.generate(schema);

    // Record root for barrels (first model matches $id)
    const root = models[0]?.modelName;
    if (root && dir)
      (dir === "incoming" ? incomingNames : outgoingNames).add(root);

    for (const m of models) {
      if (emitted.has(m.modelName)) continue;
      emitted.add(m.modelName);

      // Validate that the generated code looks reasonable
      if (!m.result || m.result.trim().length === 0) {
        console.error(`Warning: Empty result for model ${m.modelName}`);
        continue;
      }

      // Add `export` to top-level declarations (interface | type | enum)
      const exported = m.result
        .replace(/^(\s*)(interface\s+)/m, "$1export $2")
        .replace(/^(\s*)(type\s+)/m, "$1export $2")
        .replace(/^(\s*)(enum\s+)/m, "$1export $2");

      pieces.push(exported);
    }
  }

  const header = `/* Auto-generated from AsyncAPI
 * Role: ${role}
 * DO NOT EDIT MANUALLY
 */\n\n`;
  writeFileSync(outTypesPath, header + pieces.join("\n\n") + "\n", "utf8");

  const toBarrel = (names: Set<string>, label: "incoming" | "outgoing") =>
    `// Auto-generated barrel for ${label} payloads\n` +
    `export type {\n${[...names]
      .sort()
      .map(n => `  ${n},`)
      .join("\n")}\n} from "./asyncapi-types";\n`;

  writeFileSync(outIncomingPath, toBarrel(incomingNames, "incoming"), "utf8");
  writeFileSync(outOutgoingPath, toBarrel(outgoingNames, "outgoing"), "utf8");

  console.log(`Wrote ${outTypesPath}`);
  console.log(`Wrote ${outIncomingPath} (${incomingNames.size} types)`);
  console.log(`Wrote ${outOutgoingPath} (${outgoingNames.size} types)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
