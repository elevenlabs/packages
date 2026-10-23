import type { Options } from "@elevenlabs/client";

type ReactNativeAudioSession = NonNullable<
  NonNullable<NonNullable<Options["webRtc"]>["reactNative"]>["audioSession"]
>;

/** The `preferredOutputList` type, derived from `Options` so it cannot drift. */
export type AndroidPreferredOutputList = NonNullable<
  NonNullable<ReactNativeAudioSession["android"]>["preferredOutputList"]
>;

/**
 * The native module's own constructor default, spelled out so it can be sent
 * explicitly. `AudioSwitchManager` seeds this same order in its constructor.
 */
export const ANDROID_DEFAULT_PREFERRED_OUTPUT_LIST: AndroidPreferredOutputList =
  ["bluetooth", "headset", "speaker", "earpiece"];

/**
 * Resolves the `preferredOutputList` to send to the native AudioSession.
 *
 * The key is always sent, never omitted. `LivekitReactNativeModule.configureAudio`
 * writes `preferredOutputList` only when the key is present and has no `else`
 * branch, and it stores the value on `AudioSwitchManager.preferredDeviceList`,
 * a field of the native module that lives as long as the React context.
 * `stopAudioSession()` clears the `AudioSwitch` but not that field, and the next
 * `startAudioSession()` builds a fresh `AudioSwitch` from whatever it still
 * holds. Omitting the key therefore means "keep the previous session's order",
 * not "use the default", so a single overridden session would silently pin the
 * routing of every session opened after it.
 *
 * An empty list is resolved to the default rather than forwarded, because the
 * native audio switch maps an empty list onto its own default order, which
 * places earpiece above speaker and so is not the default documented here.
 */
export function resolveAndroidPreferredOutputList(
  preferredOutputList: AndroidPreferredOutputList | undefined
): AndroidPreferredOutputList {
  if (!preferredOutputList?.length) {
    return ANDROID_DEFAULT_PREFERRED_OUTPUT_LIST;
  }

  const duplicate = preferredOutputList.find(
    (output, index) => preferredOutputList.indexOf(output) !== index
  );
  if (duplicate !== undefined) {
    throw new Error(
      "webRtc.reactNative.audioSession.android.preferredOutputList must not " +
        `contain duplicate entries, but "${duplicate}" appears more than once. ` +
        "The native audio switch rejects duplicates from a task posted to the " +
        "main looper, after startAudioSession() has already resolved, so the " +
        "resulting exception crashes the app rather than failing this call."
    );
  }

  return preferredOutputList;
}
