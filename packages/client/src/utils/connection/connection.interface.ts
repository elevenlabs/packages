import type { IncomingSocketEvent, OutgoingSocketEvent } from "../events";

export type Language =
  | "en"
  | "ja"
  | "zh"
  | "de"
  | "hi"
  | "fr"
  | "ko"
  | "pt"
  | "it"
  | "es"
  | "id"
  | "nl"
  | "tr"
  | "pl"
  | "sv"
  | "bg"
  | "ro"
  | "ar"
  | "cs"
  | "el"
  | "fi"
  | "ms"
  | "da"
  | "ta"
  | "uk"
  | "ru"
  | "hu"
  | "no"
  | "vi";

export type OnDisconnectCallback = (details: DisconnectionDetails) => void;
export type OnMessageCallback = (event: IncomingSocketEvent) => void;

export type DisconnectionDetails =
	| {
			reason: "error";
			message: string;
			context: Event;
	  }
	| {
			reason: "agent";
			context: CloseEvent;
	  }
	| {
			reason: "user";
	  };

export type FormatConfig = {
	format: "pcm" | "ulaw";
	sampleRate: number;
};

export type SessionConfig = {
  origin?: string;
  authorization?: string;
  overrides?: {
    agent?: {
      prompt?: {
        prompt?: string;
      };
      firstMessage?: string;
      language?: Language;
    };
    tts?: {
      voiceId?: string;
    };
  };
  customLlmExtraBody?: unknown;
  dynamicVariables?: Record<string, string | number | boolean>;
  connectionDelay?: {
    default: number;
    android?: number;
    ios?: number;
  };
  connectionType?: ConnectionType;
} & (
  | { signedUrl: string; agentId?: undefined }
  | { agentId: string; signedUrl?: undefined }
);

export enum ConnectionType {
  WEBSOCKET = "websocket",
  WEBRTC = "webrtc",
}

export interface ConnectionInterface {
	close: () => void;
	sendMessage: (message: OutgoingSocketEvent) => void;
	onMessage: (callback: OnMessageCallback) => void;
	onDisconnect: (callback: OnDisconnectCallback) => void;
}