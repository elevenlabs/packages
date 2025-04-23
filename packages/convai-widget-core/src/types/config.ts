import { Language } from "@11labs/client";

export type Variant = "full" | "compact";
export type FeedbackMode = "none" | "during" | "end";

export interface WidgetConfig extends Partial<TextContents> {
  variant: Variant;
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
