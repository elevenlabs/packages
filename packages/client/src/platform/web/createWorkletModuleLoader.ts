const URLCache = new Map<string, string>();

// The cache has to distinguish "the caller asked for this specific path" from
// "the caller asked us to inline the source", and one self-hosted path from
// another. Keying on the name alone lets whichever call happens to land first
// answer every later call, whatever it asked for.
function cacheKey(name: string, path?: string) {
  return path ? `${name} ${path}` : name;
}

export function createWorkletModuleLoader(name: string, sourceCode: string) {
  return async (worklet: AudioWorklet, path?: string) => {
    const key = cacheKey(name, path);
    const cachedUrl = URLCache.get(key);
    if (cachedUrl) {
      return worklet.addModule(cachedUrl);
    }

    // If a path is provided, use it directly (CSP-friendly approach)
    if (path) {
      try {
        await worklet.addModule(path);
        URLCache.set(key, path);
        return;
      } catch (error) {
        throw new Error(
          `Failed to load the ${name} worklet module from path: ${path}. Error: ${error}`
        );
      }
    }

    const blob = new Blob([sourceCode], { type: "application/javascript" });
    const blobURL = URL.createObjectURL(blob);
    try {
      await worklet.addModule(blobURL);
      URLCache.set(key, blobURL);
      return;
    } catch {
      URL.revokeObjectURL(blobURL);
    }

    try {
      // Attempting to start a conversation in Safari inside an iframe will
      // throw a CORS error because the blob:// protocol is considered
      // cross-origin. In such cases, fall back to using a base64 data URL:
      const base64 = btoa(sourceCode);
      const moduleURL = `data:application/javascript;base64,${base64}`;
      await worklet.addModule(moduleURL);
      URLCache.set(key, moduleURL);
    } catch (error) {
      throw new Error(
        `Failed to load the ${name} worklet module. Make sure the browser supports AudioWorklets. If you are using a strict CSP, you may need to self-host the worklet files.`
      );
    }
  };
}
