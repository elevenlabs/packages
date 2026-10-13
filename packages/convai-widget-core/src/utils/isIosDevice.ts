// Mirrors isIosDevice in the client package, which is not part of its public
// or internal entry points.
export function isIosDevice(): boolean {
  return (
    [
      "iPad Simulator",
      "iPhone Simulator",
      "iPod Simulator",
      "iPad",
      "iPhone",
      "iPod",
    ].includes(navigator.platform) ||
    // iPad on iOS 13 reports itself as a Mac with touch support.
    (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  );
}
