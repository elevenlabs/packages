const LIBSAMPLERATE_JS =
  "https://cdn.jsdelivr.net/npm/@alexanderolsen/libsamplerate-js@2.1.2/dist/libsamplerate.worklet.js";

export async function addLibsamplerateModule(
  context: AudioContext,
  customPath?: string
) {
  // Use custom libsamplerate path if provided, otherwise fallback to CDN
  const libsamplerateUrl = customPath || LIBSAMPLERATE_JS;
  await context.audioWorklet.addModule(libsamplerateUrl);
}
