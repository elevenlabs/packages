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
  text_contents: {
    start_chat: "Start a call",
  },
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
  end_call_test: {
    ...BASIC_CONFIG,
    text_only: true,
    transcript_enabled: true,
    text_input_enabled: true,
    first_message: "",
  localized: {
    ...BASIC_CONFIG,
    terms_html: "<p>Default Terms in English</p>",
    terms_key: "terms_default",
    supported_language_overrides: ["es", "fr"],
    language_presets: {
      es: {
        text_contents: {
          start_chat: "Iniciar una llamada",
        },
        first_message: "¡Hola! ¿Cómo puedo ayudarte?",
        terms_html: "<p>Términos en Español</p>",
        terms_key: "terms_es",
      },
      fr: {
        text_contents: {
          start_chat: "Commencer un appel",
        },
        first_message: "Bonjour! Comment puis-je vous aider?",
        terms_html: "<p>Termes en Français</p>",
        terms_key: "terms_fr",
      },
    },
  },
} as const satisfies Record<string, WidgetConfig>;

function isValidAgentId(agentId: string): agentId is keyof typeof AGENTS {
  return agentId in AGENTS;
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
      client.send(
        JSON.stringify({
          type: "agent_response",
          agent_response_event: { agent_response: config.first_message },
        })
      );
      if (config.text_only) {
        client.send(
          JSON.stringify({
            type: "agent_response",
            agent_response_event: {
              agent_response: "Another agent response",
            },
          })
        );
        await new Promise(resolve => setTimeout(resolve, 1000));
        client.close();
      } else {
        client.send(
          JSON.stringify({
            type: "user_transcript",
            user_transcription_event: { user_transcript: "User transcript" },
          })
        );
      }
      if (agentId === "fail") {
        client.addEventListener("message", () => {
          client.close(3000, "Test reason");
        });
      }
      if (agentId === "end_call_test") {
        client.addEventListener("message", async () => {
          client.send(
            JSON.stringify({
              type: "agent_chat_response_part",
              text_response_part: {
                text: "",
                type: "start",
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 50));
          client.send(
            JSON.stringify({
              type: "agent_response",
              agent_response_event: {
                agent_response: "Goodbye! Have a great day!",
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
              },
            })
          );
          await new Promise(resolve => setTimeout(resolve, 50));
          client.close(1000);
        });
      }
    })
);
