import { Language } from "@elevenlabs/client";

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
export type FeedbackType = "rating";

export interface WidgetConfig {
  variant: Variant;
  placement: Placement;
  avatar: AvatarConfig;
  feedback_mode: FeedbackMode;
  end_feedback?: {
    type: FeedbackType;
  } | null;
  language: Language;
  supported_language_overrides?: Language[];
  terms_html?: string;
  terms_text?: string;
  terms_key?: string;
  mic_muting_enabled: boolean;
  transcript_enabled: boolean;
  text_input_enabled: boolean;
  default_expanded: boolean;
  always_expanded: boolean;
  text_contents: Partial<TextContents>;
  styles?: Partial<Styles>;
  language_presets: Partial<
    Record<
      Language,
      {
        text_contents?: Partial<TextContents>;
        first_message?: string;
        terms_html?: string;
        terms_text?: string;
        terms_key?: string;
      }
    >
  >;
  disable_banner: boolean;
  override_link?: string;
  text_only: boolean;
  supports_text_only: boolean;
  first_message?: string;
  use_rtc?: boolean;
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
  start_chat: "Start a chat",
  send_message: "Send",
  new_call: "New call",
  end_call: "End",
  mute_microphone: "Mute microphone",
  switch_to_voice: "Enable voice mode",
  change_language: "Change language",
  collapse: "Collapse",
  expand: "Expand",
  copied: "Copied!",
  accept_terms: "Accept",
  dismiss_terms: "Cancel",

  listening_status: "Listening",
  speaking_status: "Talk to interrupt",
  connecting_status: "Connecting",
  chatting_status: "Chatting with AI Agent",

  input_label: "Text message input",
  input_placeholder: "Send a message",
  input_placeholder_text_only: "Send a message",
  input_placeholder_new_conversation: "Start a new conversation",

  user_ended_conversation: "You ended the conversation",
  agent_ended_conversation: "The agent ended the conversation",
  conversation_id: "ID",
  error_occurred: "An error occurred",
  copy_id: "Copy ID",
  initiate_feedback: "How was this conversation?",
  request_follow_up_feedback: "Tell us more",
  thanks_for_feedback: "Thank you for your feedback!",
  thanks_for_feedback_details:
    "Your feedback helps us improve our service and better support you in the future.",
  follow_up_feedback_placeholder: "Tell us more about your experience...",
  submit: "Submit",
  go_back: "Go back",
  copy: "Copy",
  download: "Download",
  wrap: "Wrap",
};

export const TextKeys = Object.keys(
  DefaultTextContents
) as (keyof typeof DefaultTextContents)[];

export type TextContents = typeof DefaultTextContents;

export const DefaultStyles = {
  base: "#ffffff",
  base_hover: "#f9fafb",
  base_active: "#f3f4f6",
  base_border: "#e5e7eb",
  base_subtle: "#6b7280",
  base_primary: "#000000",
  base_error: "#ef4444",
  accent: "#000000",
  accent_hover: "#1f2937",
  accent_active: "#374151",
  accent_border: "#4b5563",
  accent_subtle: "#6b7280",
  accent_primary: "#ffffff",
  overlay_padding: 32,
  button_radius: 18,
  input_radius: 10,
  bubble_radius: 15,
  sheet_radius: "calc(var(--el-button-radius) + 6px)",
  compact_sheet_radius: "calc(var(--el-button-radius) + 12px)",
  dropdown_sheet_radius: "calc(var(--el-input-radius) + 6px)",
};

export const StyleKeys = Object.keys(
  DefaultStyles
) as (keyof typeof DefaultStyles)[];

export type Styles = typeof DefaultStyles;

export function parseLocation(location: string = "us"): Location {
  switch (location) {
    case "eu-residency":
    case "in-residency":
    case "us":
    case "global":
      return location;
    default:
      console.warn(
        `[ConversationalAI] Invalid server-location: ${location}. Defaulting to "us"`
      );
      return "us";
  }
}
export type Location = "us" | "global" | "eu-residency" | "in-residency";
