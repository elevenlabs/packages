// Which @elevenlabs/client entry point Metro picks, per platform, using this
// app's own Metro and metro.config.js. Metro has no public resolve-only API,
// so this drives the resolver its bundler uses internally.

const assert = require("node:assert/strict");
const path = require("node:path");
const { test, before, after } = require("node:test");

const appRoot = __dirname;
const repoRoot = path.resolve(appRoot, "../..");

// The Metro this app bundles with, not a copy of our own.
const metroRoot = path.dirname(
  require.resolve("metro/package.json", {
    paths: [require.resolve("expo/package.json", { paths: [appRoot] })],
  })
);
const Metro = require(metroRoot);
const DependencyGraph = require(
  path.join(metroRoot, "src/node-haste/DependencyGraph")
).default;

// A bare "@elevenlabs/client" import as @elevenlabs/react-native makes it.
const origin = require.resolve("@elevenlabs/react-native", {
  paths: [appRoot],
});

let graph;

before(async () => {
  const config = await Metro.loadConfig({
    cwd: appRoot,
    config: path.join(appRoot, "metro.config.js"),
  });
  graph = new DependencyGraph(config, { watch: false });
  await graph.ready();
});

after(() => graph.end());

function resolveClient(platform) {
  const { filePath } = graph.resolveDependency(
    origin,
    {
      name: "@elevenlabs/client",
      data: { key: "test", isESMImport: true, asyncType: null, locs: [] },
    },
    platform,
    { dev: true, customResolverOptions: {} }
  );
  return path.relative(repoRoot, filePath);
}

for (const platform of ["ios", "android"]) {
  test(`${platform} resolves the React Native entry point`, () => {
    assert.equal(
      resolveClient(platform),
      "packages/client/dist/platform/react-native/index.js"
    );
  });
}

test("web resolves the browser entry point", () => {
  assert.equal(
    resolveClient("web"),
    "packages/client/dist/platform/web/index.js"
  );
});
