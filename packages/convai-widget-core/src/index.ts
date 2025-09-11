import register from "preact-custom-element";
import { CustomAttributeList } from "./types/attributes";
import { ConvAIWidget } from "./widget";
import type { FunctionComponent } from "preact";
import type { CustomAttributes } from "./types/attributes";

export type { CustomAttributes } from "./types/attributes";

export function registerWidget(tagName = "elevenlabs-convai") {
  // Type assertion needed because preact-custom-element expects standard Preact props
  // but our component only accepts CustomAttributes for web component usage
  register(
    ConvAIWidget as FunctionComponent<CustomAttributes>,
    tagName,
    [...CustomAttributeList],
    {
      shadow: true,
      mode: "open",
    }
  );
}
