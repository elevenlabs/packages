import { PACKAGE_VERSION } from "./version";

export { CALLBACK_KEYS } from "./BaseConversation";
export { mergeOptions } from "./utils/mergeOptions";
export {
  parseLocation,
  getOriginForLocation,
  getLivekitUrlForLocation,
} from "./utils/location";

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
