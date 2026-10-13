// Mirrors isIosDevice and isAndroidDevice in the client package, which are not
// part of its public or internal entry points.
export function isMobileDevice(): boolean {
  const isIos =
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 reports itself as a Mac with touch support.
    (navigator.userAgent.includes("Mac") && "ontouchend" in document);
  return isIos || /android/i.test(navigator.userAgent);
}
