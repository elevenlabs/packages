import { Language } from "@11labs/client";

export const Variants = ["tiny", "compact", "full"] as const;
export type Variant = (typeof Variants)[number];

export function parseVariant(variant: string | undefined): Variant {
  return Variants.includes(variant as Variant)
    ? (variant as Variant)
    : Variants[0];
}

export const Placements = [
  "top-left",
  "top",
  "top-right",
  "bottom-left",
  "bottom",
  "bottom-right",
] as const;
export type Placement = (typeof Placements)[number];
export function parsePlacement(placement: string | undefined): Placement {
  return Placements.includes(placement as Placement)
    ? (placement as Placement)
    : "bottom-right";
}

export type FeedbackMode = "none" | "during" | "end";

export interface WidgetConfig extends Partial<TextContents> {
  variant: Variant;
  placement: Placement;
  avatar: AvatarConfig;
  show_avatar_when_collapsed: boolean;
  feedback_mode: FeedbackMode;
  language: Language;
  supported_language_overrides?: Language[];
  bg_color?: string;
  text_color?: string;
  btn_color?: string;
  btn_text_color?: string;
  border_radius?: number;
  border_color?: string;
  focus_color?: string;
  btn_radius?: number;
  terms_html?: string;
  terms_key?: string;
  disable_banner: boolean;
  mic_muting_enabled: boolean;
}

export type AvatarConfig =
  | {
      type: "orb";
      color_1: string;
      color_2: string;
    }
  | {
      type: "url";
      custom_url: string;
    }
  | {
      type: "image";
      url: string;
    };

export const DefaultTextContents = {
  start_call_text: "Start a call",
  end_call_text: "End",
  action_text: "Need help?",
  expand_text: "Chat with AI",
  listening_text: "Listening",
  speaking_text: "Talk to interrupt",
};

export type TextContents = typeof DefaultTextContents;
