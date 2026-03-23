export { CALLBACK_KEYS } from "./BaseConversation";
export { mergeOptions } from "./utils/mergeOptions";
export {
  parseLocation,
  getOriginForLocation,
  getLivekitUrlForLocation,
} from "./utils/location";
export { sourceInfo, setSourceInfo } from "./sourceInfo";
export type { SourceInfo } from "./sourceInfo";
export {
  setSetupStrategy,
  webSessionSetup,
} from "./platform/VoiceSessionSetup";
export type {
  VoiceSessionSetupStrategy,
  VoiceSessionSetupResult,
} from "./platform/VoiceSessionSetup";
export { attachInputToConnection } from "./utils/attachInputToConnection";
export { attachConnectionToOutput } from "./utils/attachConnectionToOutput";
export { createConnection } from "./utils/ConnectionFactory";
export type { InputEventTarget, InputListener } from "./utils/input";
export type { PlaybackEventTarget, PlaybackListener } from "./utils/output";
export type { FormatConfig } from "./utils/BaseConnection";
