export function isIosDevice() {
  return (
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 detection
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}

export function isAndroidDevice() {
  return /android/i.test(navigator.userAgent);
}

// Desktop Safari applies the same gesture-scoped audio policy as iOS, so the
// unlock and priming paths must run there too. `navigator.vendor` is
// deprecated but stable across WebKit builds, and no feature check exposes
// the autoplay policy.
export function isWebKitBrowser() {
  return (
    typeof navigator !== "undefined" &&
    navigator.vendor === "Apple Computer, Inc."
  );
}
