import { http, HttpResponse, ws } from "msw";
import { setupWorker } from "msw/browser";
import { WidgetConfig } from "../types/config";

const BASIC_CONFIG: WidgetConfig = {
  variant: "full",
  placement: "bottom-right",
  avatar: {
    type: "orb",
    color_1: "#000000",
    color_2: "#ffffff",
  },
  feedback_mode: "end",
  end_feedback: {
    type: "rating",
  },
  language: "en",
  mic_muting_enabled: false,
  transcript_enabled: false,
  text_input_enabled: false,
  default_expanded: false,
  always_expanded: false,
  dismissible: false,
  text_contents: {},
  terms_html: "Test terms",
  language_presets: {},
  disable_banner: false,
  text_only: false,
  supports_text_only: true,
  first_message: "Agent response",
  use_rtc: false,
};

export const AGENTS = {
  basic: BASIC_CONFIG,
  text_only: {
    ...BASIC_CONFIG,
    text_only: true,
  },
  webrtc: {
    ...BASIC_CONFIG,
    use_rtc: true,
  },
  fail: BASIC_CONFIG,
  // Held in the concurrency wait queue and never admitted.
  queued: BASIC_CONFIG,
  // Expanded with no transcript so the avatar overlay renders the waiting copy.
  queued_overlay: {
    ...BASIC_CONFIG,
    text_input_enabled: true,
    default_expanded: true,
  },
  // Admitted from the wait queue after a delay.
  queue_admit: BASIC_CONFIG,
  // The wait queue times out and the server closes with an error.
  queue_timeout: BASIC_CONFIG,
  end_call_test: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    first_message: "",
  },
  localized: {
    ...BASIC_CONFIG,
    terms_html: "<p>Default Terms in English</p>",
    terms_key: "terms_default",
    supported_language_overrides: ["es", "fr"],
    first_message_rich_content: {
      component: "buttons",
      props: {
        buttons: [
          { type: "message", label: "Track my order", message: "Track" },
        ],
      },
    },
    language_presets: {
      es: {
        text_contents: {
          start_chat: "Iniciar una llamada",
        },
        first_message: "¡Hola! ¿Cómo puedo ayudarte?",
        first_message_rich_content: {
          component: "buttons",
          props: {
            buttons: [
              {
                type: "message",
                label: "Rastrear mi pedido",
                message: "Rastrear",
              },
            ],
          },
        },
        terms_html: "<p>Términos en Español</p>",
        terms_key: "terms_es",
      },
      fr: {
        text_contents: {
          start_chat: "Commencer un appel",
        },
        first_message: "Bonjour! Comment puis-je vous aider?",
        first_message_rich_content: {
          component: "buttons",
          props: {
            buttons: [
              {
                type: "message",
                label: "Suivre ma commande",
                message: "Suivre",
              },
            ],
          },
        },
        terms_html: "<p>Termes en Français</p>",
        terms_key: "terms_fr",
      },
    },
  },
  terms_disabled_with_stale_presets: {
    ...BASIC_CONFIG,
    text_only: true,
    default_expanded: true,
    // Production serialises the kill switch as `null`, not `undefined`.
    // HttpResponse.json -> JSON.stringify strips `undefined`, so using
    // `null` keeps the mock faithful to the wire payload.
    terms_html: null,
    terms_text: null,
    supported_language_overrides: ["en"],
    language_presets: {
      en: {
        terms_html: "<p>Stale preset terms</p>",
        terms_text: "Stale preset terms",
      },
    },
  },
  markdown: {
    ...BASIC_CONFIG,
    text_only: true,
    terms_html: undefined,
    default_expanded: true,
    markdown_link_allowed_hosts: [{ hostname: "*" }],
    first_message: `# Heading 1

This is **bold** and *italic* text.

- List item 1
- List item 2

1. Ordered item 1
2. Ordered item 2

\`inline code\`

\`\`\`javascript
const codeBlock = true;
\`\`\`

[Link text](https://example.com)

![Alt text](data:image/gif;base64,R0lGODlhAQABAIAAAP///wAAACwAAAAAAQABAAACAkQBADs=)

> Blockquote text

| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |

---
`,
  },
  markdown_no_links: {
    ...BASIC_CONFIG,
    text_only: true,
    terms_html: undefined,
    default_expanded: true,
    markdown_link_allowed_hosts: [],
    first_message: `No links should be clickable: [Link text](https://example.com/allowed)`,
  },
  markdown_domain_allowlist: {
    ...BASIC_CONFIG,
    text_only: true,
    terms_html: undefined,
    default_expanded: true,
    markdown_link_allowed_hosts: [{ hostname: "example.com" }],
    first_message: `[Allowed https link](https://example.com/allowed)

[Allowed http link](http://example.com/http-allowed)

[Blocked link](https://evil.com/blocked)
`,
  },
  markdown_default_domain: {
    ...BASIC_CONFIG,
    text_only: true,
    terms_html: undefined,
    default_expanded: true,
    first_message: `[Relative link](/relative)`,
  },
  markdown_agent_response: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    terms_html: undefined,
    default_expanded: true,
    markdown_link_allowed_hosts: [{ hostname: "*" }],
    first_message: "Agent response",
  },
  tool_call: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    show_agent_status: true,
    terms_html: undefined,
    default_expanded: true,
    first_message: "",
  },
  tool_call_late_final: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    show_agent_status: true,
    terms_html: undefined,
    default_expanded: true,
    first_message: "",
  },
  final_message_after_tool: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    show_agent_status: true,
    terms_html: undefined,
    default_expanded: true,
    first_message: "Before you go, was this conversation helpful today?",
  },
  response_before_stream_tool: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    show_agent_status: true,
    terms_html: undefined,
    default_expanded: true,
    first_message: "",
  },
  stream_consolidation: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    terms_html: undefined,
    default_expanded: true,
    first_message: "",
  },
  streamed_first_reply: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    terms_html: undefined,
    default_expanded: true,
  },
  streamed_first_message: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    terms_html: undefined,
    default_expanded: true,
  },
  streamed_first_message_with_final: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    terms_html: undefined,
    default_expanded: true,
  },
  audio_tags_strip: {
    ...BASIC_CONFIG,
    text_only: true,
    default_expanded: true,
    terms_html: undefined,
    strip_audio_tags: true,
    first_message: "[happy] Hello there! [excited] How can I help you today?",
  },
  audio_tags_no_strip: {
    ...BASIC_CONFIG,
    text_only: true,
    default_expanded: true,
    terms_html: undefined,
    strip_audio_tags: false,
    first_message: "[happy] Hello there! [excited] How can I help you today?",
  },
  audio_tags_voice_strip: {
    ...BASIC_CONFIG,
    text_only: false,
    transcript_enabled: true,
    default_expanded: true,
    terms_html: undefined,
    strip_audio_tags: true,
    first_message: "[happy] Hello there! [excited] How can I help you today?",
  },
  audio_tags_voice_style: {
    ...BASIC_CONFIG,
    text_only: false,
    transcript_enabled: true,
    default_expanded: true,
    terms_html: undefined,
    strip_audio_tags: false,
    first_message: "[happy] Hello there! [excited] How can I help you today?",
  },
  voice_markdown: {
    ...BASIC_CONFIG,
    text_only: false,
    transcript_enabled: true,
    default_expanded: true,
    terms_html: undefined,
    strip_audio_tags: false,
    markdown_link_allowed_hosts: [{ hostname: "*" }],
    first_message:
      "This is **bold** voice text with a [link](https://example.com) and [happy] an audio tag, but `[sad]` stays literal in code.",
  },
  voice_markdown_blocked_link: {
    ...BASIC_CONFIG,
    text_only: false,
    transcript_enabled: true,
    default_expanded: true,
    terms_html: undefined,
    strip_audio_tags: false,
    markdown_link_allowed_hosts: [{ hostname: "example.com" }],
    first_message:
      "[happy] See [Evil link](https://evil.com/blocked) for details.",
  },
  file_upload: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    file_input_config: {
      enabled: true,
      max_files_per_conversation: 2,
    },
    terms_html: undefined,
    default_expanded: true,
    first_message: "",
  },
  no_file_upload: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    file_input_config: {
      enabled: false,
    },
    terms_html: undefined,
    default_expanded: true,
    first_message: "",
  },
  external_agent: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    terms_html: undefined,
    default_expanded: true,
    first_message: "",
  },
  text_and_voice: {
    ...BASIC_CONFIG,
    text_only: false,
    supports_text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    terms_html: undefined,
    default_expanded: true,
    first_message: "Welcome message",
  },
  text_and_voice_rich_content: {
    ...BASIC_CONFIG,
    text_only: false,
    supports_text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    terms_html: undefined,
    default_expanded: true,
    first_message: "Welcome message",
    first_message_rich_content: {
      component: "buttons",
      props: {
        buttons: [
          { type: "message", label: "Track my order", message: "Track" },
        ],
      },
    },
  },
  text_and_voice_audio_tags: {
    ...BASIC_CONFIG,
    text_only: false,
    supports_text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    strip_audio_tags: true,
    terms_html: undefined,
    default_expanded: true,
    first_message: "[happy] Hello there! [excited] How can I help you today?",
  },
} as const satisfies Record<string, WidgetConfig>;

function isValidAgentId(agentId: string): agentId is keyof typeof AGENTS {
  return agentId in AGENTS;
}

async function sendStreamedAgentResponse(
  client: { send(data: string): void },
  message: string,
  eventId: number,
  includeFinalResponse = true
) {
  client.send(
    JSON.stringify({
      type: "agent_chat_response_part",
      text_response_part: { text: "", type: "start", event_id: eventId },
    })
  );
  await new Promise(resolve => setTimeout(resolve, 0));
  client.send(
    JSON.stringify({
      type: "agent_chat_response_part",
      text_response_part: {
        text: message,
        type: "delta",
        event_id: eventId,
      },
    })
  );
  await new Promise(resolve => setTimeout(resolve, 0));
  if (includeFinalResponse) {
    client.send(
      JSON.stringify({
        type: "agent_response",
        agent_response_event: {
          agent_response: message,
          event_id: eventId,
        },
      })
    );
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  client.send(
    JSON.stringify({
      type: "agent_chat_response_part",
      text_response_part: { text: "", type: "stop", event_id: eventId },
    })
  );
}

export const Worker = setupWorker(
  http.get<{ agentId: string }>(
    `${import.meta.env.VITE_SERVER_URL_US}/v1/convai/agents/:agentId/widget`,
    ({ params }) => {
      if (isValidAgentId(params.agentId)) {
        return HttpResponse.json({
          agent_id: params.agentId,
          widget_config: AGENTS[params.agentId],
        });
      }

      return HttpResponse.error();
    }
  ),
  http.post(
    `${import.meta.env.VITE_SERVER_URL_US}/v1/convai/conversations/:conversationId/files`,
    async ({ request }) => {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return HttpResponse.json({ detail: "no file" }, { status: 400 });
      }
      return HttpResponse.json({ file_id: `file_${file.name}` });
    }
  ),
  http.delete(
    `${import.meta.env.VITE_SERVER_URL_US}/v1/convai/conversations/:conversationId/files/:fileId`,
    () => new HttpResponse(null, { status: 204 })
  ),
  ws
    .link(`${import.meta.env.VITE_WEBSOCKET_URL_US}/v1/convai/conversation`)
    .addEventListener("connection", async ({ client }) => {
      const agentId = client.url.searchParams.get(
        "agent_id"
      ) as keyof typeof AGENTS;
      const config = AGENTS[agentId];
      const conversationId = Math.random().toString(36).substring(7);
      client.send(
        JSON.stringify({
          type: "conversation_initiation_metadata",
          conversation_initiation_metadata_event: {
            conversation_id: conversationId,
            agent_output_audio_format: "pcm_16000",
            user_input_audio_format: "pcm_16000",
          },
        })
      );
      await new Promise(resolve => setTimeout(resolve, 0));
      if (
        agentId === "streamed_first_message" ||
        agentId === "streamed_first_message_with_final"
      ) {
        await sendStreamedAgentResponse(
          client,
          config.first_message ?? "",
          1,
          agentId === "streamed_first_message_with_final"
        );
      } else if (agentId !== "streamed_first_reply") {
        client.send(
          JSON.stringify({
            type: "agent_response",
            agent_response_event: {
              agent_response: config.first_message,
              event_id: 1,
            },
          })
        );
      }
      // `text_and_voice` is a voice-capable agent that the widget switches to
      // text mode when the user types, so it follows the text chat script.
      const isTextChat = config.text_only || agentId === "text_and_voice";
      if (
        isTextChat &&
        agentId !== "end_call_test" &&
        agentId !== "tool_call" &&
        agentId !== "tool_call_late_final" &&
        agentId !== "final_message_after_tool" &&
        agentId !== "response_before_stream_tool" &&
        agentId !== "stream_consolidation" &&
        agentId !== "streamed_first_reply" &&
        agentId !== "streamed_first_message" &&
        agentId !== "streamed_first_message_with_final" &&
        agentId !== "file_upload" &&
        agentId !== "no_file_upload" &&
        agentId !== "external_agent"
      ) {
        const agentResponse =
          agentId === "markdown_agent_response"
            ? "Read the [setup guide](https://example.com/setup)."
            : "Another agent response";
        client.send(
          JSON.stringify({
            type: "agent_response",
            agent_response_event: {
              agent_response: agentResponse,
              event_id: 2,
            },
          })
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
        client.close();
      } else if (!isTextChat) {
        client.send(
          JSON.stringify({
            type: "user_transcript",
            user_transcription_event: {
              user_transcript: "User transcript",
              event_id: 3,
            },
          })
        );
      }
      if (agentId === "fail") {
        client.addEventListener("message", () => {
          client.close(3000, "Test reason");
        });
      }
      if (
        agentId === "queued" ||
        agentId === "queued_overlay" ||
        agentId === "queue_admit" ||
        agentId === "queue_timeout"
      ) {
        client.send(
          JSON.stringify({
            type: "queue_status",
            queue_status_event: { status: "waiting" },
          })
        );
      }
      if (agentId === "queued") {
        // A typing indicator arriving while queued must stay hidden.
        client.send(JSON.stringify({ type: "external_agent_connected" }));
        client.send(
          JSON.stringify({
            type: "agent_typing",
            agent_typing_event: { is_typing: true },
          })
        );
        // Rich-content buttons arriving while queued must render disabled.
        client.send(
          JSON.stringify({
            type: "rich_content",
            rich_content: {
              rich_content_id: "rc_queued",
              component: "buttons",
              props: {
                buttons: [
                  {
                    type: "message",
                    label: "Quick reply",
                    message: "Quick reply",
                  },
                ],
              },
              event_id: 2,
            },
          })
        );
      }
      if (agentId === "queue_admit") {
        await new Promise(resolve => setTimeout(resolve, 1500));
        client.send(
          JSON.stringify({
            type: "queue_status",
            queue_status_event: { status: "admitted" },
          })
        );
        client.send(
          JSON.stringify({
            type: "agent_response",
            agent_response_event: {
              agent_response: "Queue cleared response",
              event_id: 4,
            },
          })
        );
      }
      if (agentId === "queue_timeout") {
        await new Promise(resolve => setTimeout(resolve, 1000));
        client.send(
          JSON.stringify({
            type: "queue_status",
            queue_status_event: { status: "timed_out" },
          })
        );
        await new Promise(resolve => setTimeout(resolve, 400));
        client.close(3008, "too many concurrent connections");
      }
      if (agentId === "end_call_test") {
        client.addEventListener("message", async () => {
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: {
                text: "",
                type: "start",
                event_id: 10,
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 50));
          client.send(
            JSON.stringify({
              type: "agent_response",
              agent_response_event: {
                agent_response: "Goodbye! Have a great day!",
                event_id: 10,
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 50));
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: {
                text: "",
                type: "stop",
                event_id: 10,
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 50));
          client.close(1000);
        });
      }
      if (agentId === "final_message_after_tool") {
        let hasReplied = false;
        client.addEventListener("message", async event => {
          const data =
            typeof event.data === "string" ? JSON.parse(event.data) : null;
          if (data?.type !== "user_message" || hasReplied) return;
          hasReplied = true;

          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "start", event_id: 2 },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_tool_request",
              agent_tool_request: {
                tool_call_id: "feedback_1",
                event_id: 2,
                tool_name: "capture_feedback",
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_tool_response",
              agent_tool_response: {
                tool_call_id: "feedback_1",
                event_id: 2,
                is_error: false,
              },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "stop", event_id: 2 },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_response",
              agent_response_event: {
                agent_response:
                  "Thank you for your feedback. Have a great day!",
                event_id: 2,
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 100));
          client.close(1000);
        });
      }
      if (agentId === "response_before_stream_tool") {
        let hasReplied = false;
        client.addEventListener("message", async event => {
          const data =
            typeof event.data === "string" ? JSON.parse(event.data) : null;
          if (data?.type !== "user_message" || hasReplied) return;
          hasReplied = true;

          client.send(
            JSON.stringify({
              type: "agent_response",
              agent_response_event: {
                agent_response: "Recording that for you now…",
                event_id: 2,
              },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "start", event_id: 2 },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: {
                text: "Recording that for you now…",
                type: "delta",
                event_id: 2,
              },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "stop", event_id: 2 },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_tool_request",
              agent_tool_request: {
                tool_call_id: "record_1",
                event_id: 2,
                tool_name: "capture_vulnerability",
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_tool_response",
              agent_tool_response: {
                tool_call_id: "record_1",
                event_id: 2,
                is_error: false,
              },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "start", event_id: 2 },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: {
                text: "The bug has been recorded successfully. Is there anything else you would like me to help you with?",
                type: "delta",
                event_id: 2,
              },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "stop", event_id: 2 },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_response",
              agent_response_event: {
                agent_response:
                  "The bug has been recorded successfully. Is there anything else you would like me to help you with?",
                event_id: 2,
              },
            })
          );
        });
      }
      if (agentId === "tool_call_late_final") {
        let hasReplied = false;
        client.addEventListener("message", async event => {
          const data =
            typeof event.data === "string" ? JSON.parse(event.data) : null;
          if (data?.type !== "user_message" || hasReplied) return;
          hasReplied = true;

          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "start", event_id: 2 },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: {
                text: "Recording that for you now…",
                type: "delta",
                event_id: 2,
              },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "stop", event_id: 2 },
            })
          );

          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "start", event_id: 3 },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_tool_request",
              agent_tool_request: {
                tool_call_id: "tool_late_final",
                event_id: 3,
                tool_name: "capture_vulnerability",
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_response",
              agent_response_event: {
                agent_response: "Recording that for you now…",
                event_id: 2,
              },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_tool_response",
              agent_tool_response: {
                tool_call_id: "tool_late_final",
                event_id: 3,
                is_error: false,
              },
            })
          );
        });
      }
      if (agentId === "tool_call") {
        client.addEventListener("message", async () => {
          // First message before tool execution (same event_id)
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "start", event_id: 2 },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_response",
              agent_response_event: {
                agent_response: "Running the tool now.",
                event_id: 2,
              },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_tool_request",
              agent_tool_request: {
                tool_call_id: "tool_1",
                event_id: 2,
                tool_name: "test_tool",
              },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "stop", event_id: 2 },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 100));
          client.send(
            JSON.stringify({
              type: "agent_tool_response",
              agent_tool_response: {
                tool_call_id: "tool_1",
                event_id: 2,
                is_error: false,
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 50));
          // Second message after tool execution (same event_id)
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "start", event_id: 2 },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: {
                text: "Tool completed successfully",
                type: "delta",
                event_id: 2,
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "stop", event_id: 2 },
            })
          );
          client.send(
            JSON.stringify({
              type: "agent_response",
              agent_response_event: {
                agent_response: "Tool completed successfully",
                event_id: 2,
              },
            })
          );
        });
      }
      if (agentId === "stream_consolidation") {
        let hasStreamed = false;
        client.addEventListener("message", async event => {
          const data =
            typeof event.data === "string" ? JSON.parse(event.data) : null;
          if (data?.type !== "user_message" || hasStreamed) return;
          hasStreamed = true;
          // Stream a partial, then deliver the final text as an agent_response
          // for the same event_id (before stop) so it overwrites in place.
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "start", event_id: 2 },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: {
                text: "partial",
                type: "delta",
                event_id: 2,
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_response",
              agent_response_event: { agent_response: "full", event_id: 2 },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 0));
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: { text: "", type: "stop", event_id: 2 },
            })
          );
        });
      }
      if (
        agentId === "streamed_first_reply" ||
        agentId === "streamed_first_message" ||
        agentId === "streamed_first_message_with_final"
      ) {
        let hasReplied = false;
        client.addEventListener("message", async event => {
          const data =
            typeof event.data === "string" ? JSON.parse(event.data) : null;
          if (data?.type !== "user_message" || hasReplied) return;
          hasReplied = true;
          const message =
            agentId === "streamed_first_reply"
              ? "First streamed reply"
              : agentId === "streamed_first_message"
                ? (config.first_message ?? "")
                : "Production streamed reply";

          await sendStreamedAgentResponse(client, message, 2);
        });
      }
      if (agentId === "external_agent") {
        // Simulates a human agent takeover: the first user message triggers
        // "external agent connected + typing", the second one triggers a
        // handback via external_agent_disconnected with no other frames.
        let takenOver = false;
        client.addEventListener("message", async event => {
          const data =
            typeof event.data === "string" ? JSON.parse(event.data) : null;
          if (data?.type !== "user_message") return;

          if (!takenOver) {
            takenOver = true;
            client.send(
              JSON.stringify({
                type: "external_agent_connected",
                external_agent_connected_event: {},
              })
            );
            await new Promise(resolve => setTimeout(resolve, 0));
            client.send(
              JSON.stringify({
                type: "agent_typing",
                agent_typing_event: { is_typing: true },
              })
            );
            return;
          }

          client.send(
            JSON.stringify({
              type: "external_agent_disconnected",
              external_agent_disconnected_event: {},
            })
          );
        });
      }
    })
);
