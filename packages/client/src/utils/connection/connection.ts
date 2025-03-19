import type {
	ConnectionInterface,
	SessionConfig,
	OnMessageCallback,
	OnDisconnectCallback,
	FormatConfig,
	DisconnectionDetails,
} from "./connection.interface";

import type {
	InitiationClientDataEvent,
	OutgoingSocketEvent,
} from "../events";
import type { Room } from "livekit-client";

export abstract class Connection implements ConnectionInterface {
	protected disconnectionDetails: DisconnectionDetails | null = null;
	protected onDisconnectCallback: OnDisconnectCallback | null = null;
	protected onMessageCallback: OnMessageCallback | null = null;

	constructor(
		readonly connection: WebSocket | Room,
		readonly conversationId: string,
		readonly inputFormat: FormatConfig,
		readonly outputFormat: FormatConfig,
	) {}

	abstract create(config: SessionConfig): Promise<Connection>;

	abstract close(): void;

	abstract sendMessage(message: OutgoingSocketEvent): void;

	abstract onMessage(callback: OnMessageCallback): void;

	abstract onDisconnect(callback: OnDisconnectCallback): void;

	protected disconnect(details: DisconnectionDetails) {
		if (!this.disconnectionDetails) {
			this.disconnectionDetails = details;
			this.onDisconnectCallback?.(details);
		}
	}

	protected static getOverridesEvent(
		config: SessionConfig,
	): InitiationClientDataEvent {
		const overridesEvent: InitiationClientDataEvent = {
			type: "conversation_initiation_client_data",
		};

		if (config.overrides) {
			overridesEvent.conversation_config_override = {
				agent: {
					prompt: config.overrides.agent?.prompt,
					first_message: config.overrides.agent?.firstMessage,
					language: config.overrides.agent?.language,
				},
				tts: {
					voice_id: config.overrides.tts?.voiceId,
				},
			};
		}

		if (config.customLlmExtraBody) {
			overridesEvent.custom_llm_extra_body = config.customLlmExtraBody;
		}

		if (config.dynamicVariables) {
			overridesEvent.dynamic_variables = config.dynamicVariables;
		}

		return overridesEvent;
	}

	protected static parseFormat(format: string): FormatConfig {
		const [formatPart, sampleRatePart] = format.split("_");
		if (!["pcm", "ulaw"].includes(formatPart)) {
			throw new Error(`Invalid format: ${format}`);
		}

		const sampleRate = Number.parseInt(sampleRatePart);
		if (Number.isNaN(sampleRate)) {
			throw new Error(`Invalid sample rate: ${sampleRatePart}`);
		}

		return {
			format: formatPart as FormatConfig["format"],
			sampleRate,
		};
	}
}
