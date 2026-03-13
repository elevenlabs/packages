// Learn more https://docs.expo.io/guides/customizing-metro
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// In a pnpm monorepo, packages may resolve to different physical copies
// depending on which workspace imports them. Force Metro to use the copies
// from this app's node_modules so that singleton packages (react, native
// modules with global state, etc.) are only instantiated once.
const appNodeModules = path.resolve(__dirname, "node_modules");
const singletonPackages = {
  react: path.resolve(appNodeModules, "react"),
  "react-native": path.resolve(appNodeModules, "react-native"),
  "@livekit/react-native": path.resolve(
    appNodeModules,
    "@livekit/react-native"
  ),
  "@livekit/react-native-webrtc": path.resolve(
    appNodeModules,
    "@livekit/react-native-webrtc"
  ),
};

// extraNodeModules is only a fallback. To truly force resolution, we
// intercept resolveRequest and redirect matching bare imports.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Match both exact package names and subpath imports (e.g. "react/jsx-runtime")
  for (const [pkg, pkgPath] of Object.entries(singletonPackages)) {
    if (moduleName === pkg || moduleName.startsWith(pkg + "/")) {
      const rest = moduleName.slice(pkg.length); // "" or "/jsx-runtime" etc.
      return context.resolveRequest(
        { ...context, resolveRequest: undefined },
        rest ? pkgPath + rest : pkgPath,
        platform
      );
    }
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
