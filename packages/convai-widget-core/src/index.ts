import { setSourceInfo } from "@elevenlabs/client/internal";
import { PACKAGE_VERSION } from "./version";
import register from "preact-custom-element";
import { CustomAttributeList } from "./types/attributes";
import { ConvAIWidget } from "./widget";

setSourceInfo({ name: "widget", version: PACKAGE_VERSION });

export type { CustomAttributes } from "./types/attributes";

export function registerWidget(tagName = "elevenlabs-convai") {
  register(ConvAIWidget, tagName, [...CustomAttributeList], {
    shadow: true,
    mode: "open",
  });
}
