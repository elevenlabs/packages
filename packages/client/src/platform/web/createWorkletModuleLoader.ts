const URLCache = new Map<string, string>();

// The cache has to distinguish "the caller asked for this specific path" from
// "the caller asked us to inline the source", and one self-hosted path from
// another. Keying on the name alone lets whichever call happens to land first
// answer every later call, whatever it asked for.
function cacheKey(processorName: string, path?: string) {
  return path ? `${processorName} ${path}` : processorName;
}

async function addWorkletModule(
  worklet: AudioWorklet,
  name: string,
  key: string,
  sourceCode: string,
  path?: string
) {
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
}

/**
 * Returns a function that loads the worklet module into the given context and
 * instantiates its processor.
 *
 * The processor is registered under a name that includes `hash`, a content
 * hash of `sourceCode`. A self-hosted module from a different version of the
 * SDK registers a different name, so creating the node fails right after the
 * module loads rather than running a processor the client wasn't built for.
 */
export function createWorkletModuleLoader(
  name: string,
  hash: string,
  sourceCode: string
) {
  // Must match the name scripts/generateWorklets.js writes into the worklet's
  // registerProcessor() call.
  const processorName = `${name}@${hash}`;
  return async (
    context: BaseAudioContext,
    path?: string,
    options?: AudioWorkletNodeOptions
  ): Promise<AudioWorkletNode> => {
    await addWorkletModule(
      context.audioWorklet,
      name,
      cacheKey(processorName, path),
      sourceCode,
      path
    );

    try {
      return new AudioWorkletNode(context, processorName, options);
    } catch (error) {
      if (!path) {
        throw error;
      }
      throw new Error(
        `The ${name} worklet loaded from ${path} does not match this version of @elevenlabs/client: ` +
          `it did not register the "${processorName}" processor. ` +
          `Serve the copy of @elevenlabs/client/worklets/${name}.js from the installed version of the package.`,
        { cause: error }
      );
    }
  };
}
