import { PACKAGE_VERSION } from "./version";

export interface SourceInfo {
  name: string;
  version: string;
}

export let sourceInfo: Readonly<SourceInfo> = Object.freeze({
  name: "js_sdk",
  version: PACKAGE_VERSION,
});

export function setSourceInfo(value: SourceInfo): void {
  sourceInfo = Object.freeze(value);
}
