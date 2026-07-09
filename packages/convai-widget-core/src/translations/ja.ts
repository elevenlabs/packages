import type { TextContents } from "../types/config";

/**
 * Japanese (ja) localized default text contents.
 *
 * Machine-generated for a conversational AI chat widget; review before relying
 * on in production. Any key omitted here falls back to the English defaults in
 * `DefaultTextContents`.
 */
const ja: Partial<TextContents> = {
  main_label: "お困りですか？",
  start_call: "通話を開始",
  start_chat: "メッセージ",
  send_message: "送信",
  new_call: "新しい通話",
  end_call: "終了",
  mute_microphone: "マイクをミュート",
  text_mode: "テキストモードに切り替え",
  voice_mode: "音声モードに切り替え",
  switched_to_text_mode: "テキストモードに切り替えました",
  switched_to_voice_mode: "音声モードに切り替えました",
  change_language: "言語を変更",
  collapse: "折りたたむ",
  expand: "展開",
  copied: "コピーしました！",
  accept_terms: "同意する",
  dismiss_terms: "キャンセル",

  listening_status: "聞き取り中",
  speaking_status: "話しかけて中断",
  connecting_status: "接続中",
  chatting_status: "AIエージェントとチャット中",

  input_label: "テキストメッセージ入力",
  input_placeholder: "メッセージを送信...",
  input_placeholder_text_only: "メッセージを送信...",
  input_placeholder_new_conversation: "新しい会話を開始",

  user_ended_conversation: "会話を終了しました",
  agent_ended_conversation: "エージェントが会話を終了しました",
  conversation_id: "ID",
  error_occurred: "エラーが発生しました",
  copy_id: "IDをコピー",
  initiate_feedback: "この会話はいかがでしたか？",
  request_follow_up_feedback: "詳しく教えてください",
  thanks_for_feedback: "フィードバックありがとうございます！",
  thanks_for_feedback_details:
    "いただいたフィードバックは、サービスの改善と今後のより良いサポートに役立てさせていただきます。",
  follow_up_feedback_placeholder: "ご感想を詳しくお聞かせください...",
  submit: "送信",
  go_back: "戻る",
  copy: "コピー",
  download: "ダウンロード",
  wrap: "折り返し",
  agent_working: "処理中...",
  agent_done: "完了",
  agent_error: "エラーが発生しました",
  attach_file: "ファイルを添付",
  remove_file: "ファイルを削除",
  file_upload_error: "ファイルのアップロードに失敗しました。",
  file_type_unsupported: "サポートされていないファイル形式です。対応形式:",
  file_too_large: "ファイルサイズが上限を超えています。",
  file_limit_reached: "この会話で添付できるファイルの上限に達しました。",
  typing_indicator: "エージェントが入力中 ...",
};

export default ja;
