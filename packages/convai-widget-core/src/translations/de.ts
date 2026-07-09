import type { TextContents } from "../types/config";

/**
 * German (de) localized default text contents.
 *
 * Machine-generated for a conversational AI chat widget; review before relying
 * on in production. Any key omitted here falls back to the English defaults in
 * `DefaultTextContents`.
 */
const de: Partial<TextContents> = {
  main_label: "Brauchst du Hilfe?",
  start_call: "Anruf starten",
  start_chat: "Nachricht",
  send_message: "Senden",
  new_call: "Neuer Anruf",
  end_call: "Beenden",
  mute_microphone: "Mikrofon stummschalten",
  text_mode: "Zum Textmodus wechseln",
  voice_mode: "Zum Sprachmodus wechseln",
  switched_to_text_mode: "Zum Textmodus gewechselt",
  switched_to_voice_mode: "Zum Sprachmodus gewechselt",
  change_language: "Sprache ändern",
  collapse: "Einklappen",
  expand: "Ausklappen",
  copied: "Kopiert!",
  accept_terms: "Akzeptieren",
  dismiss_terms: "Abbrechen",

  listening_status: "Hört zu",
  speaking_status: "Sprich, um zu unterbrechen",
  connecting_status: "Verbindung wird hergestellt",
  chatting_status: "Chat mit KI-Agent",

  input_label: "Texteingabe",
  input_placeholder: "Nachricht senden...",
  input_placeholder_text_only: "Nachricht senden...",
  input_placeholder_new_conversation: "Neue Unterhaltung starten",

  user_ended_conversation: "Du hast die Unterhaltung beendet",
  agent_ended_conversation: "Der Agent hat die Unterhaltung beendet",
  conversation_id: "ID",
  error_occurred: "Ein Fehler ist aufgetreten",
  copy_id: "ID kopieren",
  initiate_feedback: "Wie war diese Unterhaltung?",
  request_follow_up_feedback: "Erzähl uns mehr",
  thanks_for_feedback: "Vielen Dank für dein Feedback!",
  thanks_for_feedback_details:
    "Dein Feedback hilft uns, unseren Service zu verbessern und dich in Zukunft besser zu unterstützen.",
  follow_up_feedback_placeholder: "Erzähl uns mehr über deine Erfahrung...",
  submit: "Absenden",
  go_back: "Zurück",
  copy: "Kopieren",
  download: "Herunterladen",
  wrap: "Umbrechen",
  agent_working: "Arbeitet...",
  agent_done: "Abgeschlossen",
  agent_error: "Ein Fehler ist aufgetreten",
  attach_file: "Datei anhängen",
  remove_file: "Datei entfernen",
  file_upload_error: "Datei konnte nicht hochgeladen werden.",
  file_type_unsupported: "Nicht unterstützter Dateityp. Zulässige Typen:",
  file_too_large: "Die Dateigröße überschreitet das maximale Limit.",
  file_limit_reached:
    "Maximale Anzahl an Dateien für diese Unterhaltung erreicht.",
  typing_indicator: "Agent schreibt ...",
};

export default de;
