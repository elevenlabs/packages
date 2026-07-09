import type { TextContents } from "../types/config";

/**
 * Spanish (es) localized default text contents.
 *
 * Machine-generated for a conversational AI chat widget; review before relying
 * on in production. Any key omitted here falls back to the English defaults in
 * `DefaultTextContents`.
 */
const es: Partial<TextContents> = {
  main_label: "¿Necesitas ayuda?",
  start_call: "Iniciar llamada",
  start_chat: "Mensaje",
  send_message: "Enviar",
  new_call: "Nueva llamada",
  end_call: "Finalizar",
  mute_microphone: "Silenciar micrófono",
  text_mode: "Cambiar a modo texto",
  voice_mode: "Cambiar a modo voz",
  switched_to_text_mode: "Cambiado a modo texto",
  switched_to_voice_mode: "Cambiado a modo voz",
  change_language: "Cambiar idioma",
  collapse: "Contraer",
  expand: "Expandir",
  copied: "¡Copiado!",
  accept_terms: "Aceptar",
  dismiss_terms: "Cancelar",

  listening_status: "Escuchando",
  speaking_status: "Habla para interrumpir",
  connecting_status: "Conectando",
  chatting_status: "Chateando con el agente de IA",

  input_label: "Entrada de mensaje de texto",
  input_placeholder: "Envía un mensaje...",
  input_placeholder_text_only: "Envía un mensaje...",
  input_placeholder_new_conversation: "Inicia una nueva conversación",

  user_ended_conversation: "Finalizaste la conversación",
  agent_ended_conversation: "El agente finalizó la conversación",
  conversation_id: "ID",
  error_occurred: "Se produjo un error",
  copy_id: "Copiar ID",
  initiate_feedback: "¿Qué te pareció esta conversación?",
  request_follow_up_feedback: "Cuéntanos más",
  thanks_for_feedback: "¡Gracias por tus comentarios!",
  thanks_for_feedback_details:
    "Tus comentarios nos ayudan a mejorar nuestro servicio y a brindarte una mejor atención en el futuro.",
  follow_up_feedback_placeholder: "Cuéntanos más sobre tu experiencia...",
  submit: "Enviar",
  go_back: "Volver",
  copy: "Copiar",
  download: "Descargar",
  wrap: "Ajustar líneas",
  agent_working: "Trabajando...",
  agent_done: "Completado",
  agent_error: "Se produjo un error",
  attach_file: "Adjuntar archivo",
  remove_file: "Eliminar archivo",
  file_upload_error: "No se pudo subir el archivo.",
  file_type_unsupported: "Tipo de archivo no admitido. Tipos aceptados:",
  file_too_large: "El tamaño del archivo supera el límite máximo.",
  file_limit_reached:
    "Se alcanzó el número máximo de archivos para esta conversación.",
  typing_indicator: "El agente está escribiendo ...",
};

export default es;
