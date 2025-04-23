import register from "preact-custom-element";
import { CustomAttributeList } from "./types/attributes";
import { ConvAIWidget } from "./ConvAIWidget";

export type { CustomAttributes } from "./types/attributes";

export function registerWidget(tagName = "elevenlabs-convai") {
  register(ConvAIWidget, tagName, CustomAttributeList, {
    shadow: true,
  });
}
