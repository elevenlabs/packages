import type { TextContents } from "../types/config";

/**
 * French (fr) localized default text contents.
 *
 * Machine-generated for a conversational AI chat widget; review before relying
 * on in production. Any key omitted here falls back to the English defaults in
 * `DefaultTextContents`.
 */
const fr: Partial<TextContents> = {
  main_label: "Besoin d'aide ?",
  start_call: "Démarrer un appel",
  start_chat: "Message",
  send_message: "Envoyer",
  new_call: "Nouvel appel",
  end_call: "Terminer",
  mute_microphone: "Couper le micro",
  text_mode: "Passer en mode texte",
  voice_mode: "Passer en mode vocal",
  switched_to_text_mode: "Passé en mode texte",
  switched_to_voice_mode: "Passé en mode vocal",
  change_language: "Changer de langue",
  collapse: "Réduire",
  expand: "Développer",
  copied: "Copié !",
  accept_terms: "Accepter",
  dismiss_terms: "Annuler",

  listening_status: "À l'écoute",
  speaking_status: "Parlez pour interrompre",
  connecting_status: "Connexion",
  chatting_status: "Discussion avec l'agent IA",

  input_label: "Saisie de message texte",
  input_placeholder: "Envoyez un message...",
  input_placeholder_text_only: "Envoyez un message...",
  input_placeholder_new_conversation: "Démarrer une nouvelle conversation",

  user_ended_conversation: "Vous avez mis fin à la conversation",
  agent_ended_conversation: "L'agent a mis fin à la conversation",
  conversation_id: "ID",
  error_occurred: "Une erreur s'est produite",
  copy_id: "Copier l'ID",
  initiate_feedback: "Comment s'est passée cette conversation ?",
  request_follow_up_feedback: "Dites-nous en plus",
  thanks_for_feedback: "Merci pour votre retour !",
  thanks_for_feedback_details:
    "Vos retours nous aident à améliorer notre service et à mieux vous accompagner à l'avenir.",
  follow_up_feedback_placeholder: "Dites-nous en plus sur votre expérience...",
  submit: "Envoyer",
  go_back: "Retour",
  copy: "Copier",
  download: "Télécharger",
  wrap: "Retour à la ligne",
  agent_working: "En cours...",
  agent_done: "Terminé",
  agent_error: "Une erreur s'est produite",
  attach_file: "Joindre un fichier",
  remove_file: "Supprimer le fichier",
  file_upload_error: "Échec du téléchargement du fichier.",
  file_type_unsupported: "Type de fichier non pris en charge. Types acceptés :",
  file_too_large: "La taille du fichier dépasse la limite maximale.",
  file_limit_reached:
    "Nombre maximal de fichiers atteint pour cette conversation.",
  typing_indicator: "L'agent est en train d'écrire ...",
};

export default fr;
