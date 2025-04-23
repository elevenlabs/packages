import { http, HttpResponse, ws } from "msw";
import { setupWorker } from "msw/browser";
import { WidgetConfig } from "../types/config";

const BASIC_CONFIG: WidgetConfig = {
  variant: "full",
  avatar: {
    type: "orb",
    color_1: "#000",
    color_2: "#fff",
  },
  show_avatar_when_collapsed: false,
  feedback_mode: "end",
  language: "en",
  disable_banner: false,
  mic_muting_enabled: false,
};

export const AGENTS = {
  basic: BASIC_CONFIG,
  fail: BASIC_CONFIG,
} as const satisfies Record<string, WidgetConfig>;

function isValidAgentId(agentId: string): agentId is keyof typeof AGENTS {
  return agentId in AGENTS;
}

export const Worker = setupWorker(
  http.get<{ agentId: string }>(
    `${import.meta.env.VITE_SERVER_URL}/v1/convai/agents/:agentId/widget`,
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
    .link(`${import.meta.env.VITE_WEBSOCKET_URL}/v1/convai/conversation`)
    .addEventListener("connection", ({ client }) => {
      const agentId = client.url.searchParams.get("agent_id");
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
      if (agentId === "fail") {
        client.addEventListener("message", () => {
          client.close(3000, "Test reason");
        });
      }
    })
);
