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

export interface WidgetConfig {
  variant: Variant;
  placement: Placement;
  avatar: AvatarConfig;
  feedback_mode: FeedbackMode;
  language: Language;
  supported_language_overrides?: Language[];
  terms_html?: string;
  terms_key?: string;
  mic_muting_enabled: boolean;
  transcript_enabled: boolean;
  text_input_enabled: boolean;
  text_contents: Partial<Record<Language, Partial<TextContents>>>;
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
  main_label: "Need help?",
  start_call: "Start a call",
  new_call: "New call",
  end_call: "End",
  mute_microphone: "Mute microphone",
  change_language: "Change language",
  collapse: "Collapse",
  expand: "Expand",
  copied: "Copied!",
  accept_terms: "Accept",
  dismiss_terms: "Cancel",

  listening_status: "Listening",
  speaking_status: "Talk to interrupt",
  connecting_status: "Connecting",

  input_label: "Text message input",
  input_placeholder: "Or send a message",

  user_ended_conversation: "You ended the conversation",
  agent_ended_conversation: "The agent ended the conversation",
  conversation_id: "Conversation ID",
  error_occurred: "An error occurred",
  copy_id: "Copy ID",
};

export const TextKeys = Object.keys(
  DefaultTextContents
) as (keyof typeof DefaultTextContents)[];

export type TextContents = typeof DefaultTextContents;
