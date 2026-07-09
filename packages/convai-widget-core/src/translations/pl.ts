import type { TextContents } from "../types/config";

/**
 * Polish (pl) localized default text contents.
 *
 * Machine-generated for a conversational AI chat widget; review before relying
 * on in production. Any key omitted here falls back to the English defaults in
 * `DefaultTextContents`.
 */
const pl: Partial<TextContents> = {
  main_label: "Potrzebujesz pomocy?",
  start_call: "Rozpocznij rozmowę",
  start_chat: "Wiadomość",
  send_message: "Wyślij",
  new_call: "Nowa rozmowa",
  end_call: "Zakończ",
  mute_microphone: "Wycisz mikrofon",
  text_mode: "Przełącz na tryb tekstowy",
  voice_mode: "Przełącz na tryb głosowy",
  switched_to_text_mode: "Przełączono na tryb tekstowy",
  switched_to_voice_mode: "Przełączono na tryb głosowy",
  change_language: "Zmień język",
  collapse: "Zwiń",
  expand: "Rozwiń",
  copied: "Skopiowano!",
  accept_terms: "Akceptuję",
  dismiss_terms: "Anuluj",

  listening_status: "Słucham",
  speaking_status: "Mów, aby przerwać",
  connecting_status: "Łączenie",
  chatting_status: "Rozmowa z agentem AI",

  input_label: "Pole wpisywania wiadomości",
  input_placeholder: "Wyślij wiadomość...",
  input_placeholder_text_only: "Wyślij wiadomość...",
  input_placeholder_new_conversation: "Rozpocznij nową rozmowę",

  user_ended_conversation: "Zakończyłeś rozmowę",
  agent_ended_conversation: "Agent zakończył rozmowę",
  conversation_id: "ID",
  error_occurred: "Wystąpił błąd",
  copy_id: "Kopiuj ID",
  initiate_feedback: "Jak oceniasz tę rozmowę?",
  request_follow_up_feedback: "Powiedz nam więcej",
  thanks_for_feedback: "Dziękujemy za opinię!",
  thanks_for_feedback_details:
    "Twoja opinia pomaga nam ulepszać naszą usługę i lepiej wspierać Cię w przyszłości.",
  follow_up_feedback_placeholder: "Opowiedz nam więcej o swoich wrażeniach...",
  submit: "Wyślij",
  go_back: "Wróć",
  copy: "Kopiuj",
  download: "Pobierz",
  wrap: "Zawijaj wiersze",
  agent_working: "Pracuję...",
  agent_done: "Ukończono",
  agent_error: "Wystąpił błąd",
  attach_file: "Załącz plik",
  remove_file: "Usuń plik",
  file_upload_error: "Nie udało się przesłać pliku.",
  file_type_unsupported: "Nieobsługiwany typ pliku. Akceptowane typy:",
  file_too_large: "Rozmiar pliku przekracza maksymalny limit.",
  file_limit_reached: "Osiągnięto maksymalną liczbę plików dla tej rozmowy.",
  typing_indicator: "Agent pisze ...",
};

export default pl;
