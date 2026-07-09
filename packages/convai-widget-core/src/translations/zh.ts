import type { TextContents } from "../types/config";

/**
 * Chinese (Simplified) (zh) localized default text contents.
 *
 * Machine-generated for a conversational AI chat widget; review before relying
 * on in production. Any key omitted here falls back to the English defaults in
 * `DefaultTextContents`.
 */
const zh: Partial<TextContents> = {
  main_label: "需要帮助吗？",
  start_call: "开始通话",
  start_chat: "发消息",
  send_message: "发送",
  new_call: "新通话",
  end_call: "结束",
  mute_microphone: "静音麦克风",
  text_mode: "切换到文字模式",
  voice_mode: "切换到语音模式",
  switched_to_text_mode: "已切换到文字模式",
  switched_to_voice_mode: "已切换到语音模式",
  change_language: "更改语言",
  collapse: "收起",
  expand: "展开",
  copied: "已复制！",
  accept_terms: "接受",
  dismiss_terms: "取消",

  listening_status: "正在聆听",
  speaking_status: "说话即可打断",
  connecting_status: "正在连接",
  chatting_status: "正在与 AI 智能体聊天",

  input_label: "文字消息输入",
  input_placeholder: "发送消息...",
  input_placeholder_text_only: "发送消息...",
  input_placeholder_new_conversation: "开始新对话",

  user_ended_conversation: "您已结束对话",
  agent_ended_conversation: "智能体已结束对话",
  conversation_id: "ID",
  error_occurred: "发生错误",
  copy_id: "复制 ID",
  initiate_feedback: "这次对话怎么样？",
  request_follow_up_feedback: "告诉我们更多",
  thanks_for_feedback: "感谢您的反馈！",
  thanks_for_feedback_details:
    "您的反馈有助于我们改进服务，并在未来为您提供更好的支持。",
  follow_up_feedback_placeholder: "请告诉我们更多关于您的体验...",
  submit: "提交",
  go_back: "返回",
  copy: "复制",
  download: "下载",
  wrap: "自动换行",
  agent_working: "处理中...",
  agent_done: "已完成",
  agent_error: "发生错误",
  attach_file: "添加附件",
  remove_file: "移除文件",
  file_upload_error: "文件上传失败。",
  file_type_unsupported: "不支持的文件类型。支持的类型：",
  file_too_large: "文件大小超出上限。",
  file_limit_reached: "已达到此对话的文件数量上限。",
  typing_indicator: "智能体正在输入 ...",
};

export default zh;
