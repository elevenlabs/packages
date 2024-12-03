import { arrayBufferToBase64, base64ToArrayBuffer } from "./utils/audio";
import { Input, InputConfig } from "./utils/input";
import { Output } from "./utils/output";
import { Connection, SessionConfig } from "./utils/connection";
import {
  ClientToolCallEvent,
  isValidSocketEvent,
  PingEvent,
} from "./utils/events";

export type { IncomingSocketEvent } from "./utils/events";
export type { SessionConfig } from "./utils/connection";

export type Role = "user" | "ai";
export type Mode = "speaking" | "listening";
export type Status =
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected";
export type Options = SessionConfig &
  Callbacks &
  ClientToolsConfig &
  InputConfig;
export type ClientToolsConfig = {
  clientTools: Record<
    string,
    (
      parameters: any
    ) => Promise<string | number | void> | string | number | void
  >;
};
export type Callbacks = {
  onConnect: (props: { conversationId: string }) => void;
  // internal debug events, not to be used
  onDebug: (props: any) => void;
  onDisconnect: () => void;
  onError: (message: string, context?: any) => void;
  onMessage: (props: { message: string; source: Role }) => void;
  onModeChange: (prop: { mode: Mode }) => void;
  onStatusChange: (prop: { status: Status }) => void;
  onCanSendFeedbackChange: (prop: { canSendFeedback: boolean }) => void;
  onUnhandledClientToolCall?: (
    params: ClientToolCallEvent["client_tool_call"]
  ) => void;
};

const defaultClientTools = { clientTools: {} };
const defaultCallbacks: Callbacks = {
  onConnect: () => {},
  onDebug: () => {},
  onDisconnect: () => {},
  onError: () => {},
  onMessage: () => {},
  onModeChange: () => {},
  onStatusChange: () => {},
  onCanSendFeedbackChange: () => {},
};

const HTTPS_API_ORIGIN = "https://api.elevenlabs.io";

export class Conversation {
  public static async startSession(
    options: SessionConfig &
      Partial<Callbacks> &
      Partial<ClientToolsConfig> &
      Partial<InputConfig>
  ): Promise<Conversation> {
    const fullOptions: Options = {
      ...defaultClientTools,
      ...defaultCallbacks,
      ...options,
    };

    fullOptions.onStatusChange({ status: "connecting" });
    fullOptions.onCanSendFeedbackChange({ canSendFeedback: false });

    let input: Input | null = null;
    let connection: Connection | null = null;
    let output: Output | null = null;

    try {
      connection = await Connection.create(options);
      [input, output] = await Promise.all([
        Input.create({
          ...connection.inputFormat,
          preferHeadphonesForIosDevices: options.preferHeadphonesForIosDevices,
        }),
        Output.create(connection.outputFormat),
      ]);

      return new Conversation(fullOptions, connection, input, output);
    } catch (error) {
      fullOptions.onStatusChange({ status: "disconnected" });
      connection?.close();
      await input?.close();
      await output?.close();
      throw error;
    }
  }

  private lastInterruptTimestamp: number = 0;
  private mode: Mode = "listening";
  private status: Status = "connecting";
  private inputFrequencyData?: Uint8Array;
  private outputFrequencyData?: Uint8Array;
  private volume: number = 1;
  private currentEventId: number = 1;
  private lastFeedbackEventId: number = 1;
  private canSendFeedback: boolean = false;

  private constructor(
    private readonly options: Options,
    private readonly connection: Connection,
    public readonly input: Input,
    public readonly output: Output
  ) {
    this.options.onConnect({ conversationId: connection.conversationId });

    this.connection.socket.addEventListener("message", event => {
      this.onEvent(event);
    });
    this.connection.socket.addEventListener("error", event => {
      this.updateStatus("disconnected");
      this.onError("Socket error", event);
    });
    this.connection.socket.addEventListener("close", () => {
      this.updateStatus("disconnected");
      this.options.onDisconnect();
    });

    this.input.worklet.port.onmessage = this.onInputWorkletMessage;
    this.output.worklet.port.onmessage = this.onOutputWorkletMessage;
    this.updateStatus("connected");
  }

  public endSession = async () => {
    if (this.status !== "connected") return;
    this.updateStatus("disconnecting");

    this.connection.close();
    await this.input.close();
    await this.output.close();

    this.updateStatus("disconnected");
  };

  private updateMode = (mode: Mode) => {
    if (mode !== this.mode) {
      this.mode = mode;
      this.options.onModeChange({ mode });
    }
  };

  private updateStatus = (status: Status) => {
    if (status !== this.status) {
      this.status = status;
      this.options.onStatusChange({ status });
    }
  };

  private updateCanSendFeedback = () => {
    const canSendFeedback = this.currentEventId !== this.lastFeedbackEventId;
    if (this.canSendFeedback !== canSendFeedback) {
      this.canSendFeedback = canSendFeedback;
      this.options.onCanSendFeedbackChange({ canSendFeedback });
    }
  };

  private onEvent = async (event: MessageEvent) => {
    try {
      const parsedEvent = JSON.parse(event.data);

      if (!isValidSocketEvent(parsedEvent)) {
        return;
      }

      switch (parsedEvent.type) {
        case "interruption": {
          if (parsedEvent.interruption_event) {
            this.lastInterruptTimestamp =
              parsedEvent.interruption_event.event_id;
          }
          this.fadeOutAudio();
          break;
        }

        case "agent_response": {
          this.options.onMessage({
            source: "ai",
            message: parsedEvent.agent_response_event.agent_response,
          });
          break;
        }

        case "user_transcript": {
          this.options.onMessage({
            source: "user",
            message: parsedEvent.user_transcription_event.user_transcript,
          });
          break;
        }

        case "internal_tentative_agent_response": {
          this.options.onDebug({
            type: "tentative_agent_response",
            response:
              parsedEvent.tentative_agent_response_internal_event
                .tentative_agent_response,
          });
          break;
        }

        case "client_tool_call": {
          if (
            this.options.clientTools.hasOwnProperty(
              parsedEvent.client_tool_call.tool_name
            )
          ) {
            try {
              const result =
                (await this.options.clientTools[
                  parsedEvent.client_tool_call.tool_name
                ](parsedEvent.client_tool_call.parameters)) ??
                "Client tool execution successful."; // default client-tool call response

              this.connection.sendMessage({
                type: "client_tool_result",
                tool_call_id: parsedEvent.client_tool_call.tool_call_id,
                result: result,
                is_error: false,
              });
            } catch (e) {
              this.onError(
                "Client tool execution failed with following error: " +
                  (e as Error)?.message,
                {
                  clientToolName: parsedEvent.client_tool_call.tool_name,
                }
              );
              this.connection.sendMessage({
                type: "client_tool_result",
                tool_call_id: parsedEvent.client_tool_call.tool_call_id,
                result:
                  "Client tool execution failed: " + (e as Error)?.message,
                is_error: true,
              });
            }

            break;
          }

          if (this.options.onUnhandledClientToolCall) {
            this.options.onUnhandledClientToolCall(
              parsedEvent.client_tool_call
            );

            break;
          }

          this.onError(
            `Client tool with name ${parsedEvent.client_tool_call.tool_name} is not defined on client`,
            {
              clientToolName: parsedEvent.client_tool_call.tool_name,
            }
          );
          this.connection.sendMessage({
            type: "client_tool_result",
            tool_call_id: parsedEvent.client_tool_call.tool_call_id,
            result: `Client tool with name ${parsedEvent.client_tool_call.tool_name} is not defined on client`,
            is_error: true,
          });

          break;
        }

        case "audio": {
          if (this.lastInterruptTimestamp <= parsedEvent.audio_event.event_id) {
            this.addAudioBase64Chunk(parsedEvent.audio_event.audio_base_64);
            this.currentEventId = parsedEvent.audio_event.event_id;
            this.updateCanSendFeedback();
            this.updateMode("speaking");
          }
          break;
        }

        case "ping": {
          this.connection.sendMessage({
            type: "pong",
            event_id: (parsedEvent as PingEvent).ping_event.event_id,
          });
          // parsedEvent.ping_event.ping_ms can be used on client side, for example
          // to warn if ping is too high that experience might be degraded.
          break;
        }

        // unhandled events are expected to be internal events
        default: {
          this.options.onDebug(parsedEvent);
          break;
        }
      }
    } catch {
      this.onError("Failed to parse event data", { event });
      return;
    }
  };

  private onInputWorkletMessage = (event: MessageEvent): void => {
    const rawAudioPcmData = event.data[0];
    const maxVolume = event.data[1];

    // check if the sound was loud enough, so we don't send unnecessary chunks
    // then forward audio to websocket
    //if (maxVolume > 0.001) {
    if (this.status === "connected") {
      this.connection.sendMessage({
        user_audio_chunk: arrayBufferToBase64(rawAudioPcmData.buffer),
        //sample_rate: this.inputAudioContext?.inputSampleRate || this.inputSampleRate,
      });
    }
    //}
  };

  private onOutputWorkletMessage = ({ data }: MessageEvent): void => {
    if (data.type === "process") {
      this.updateMode(data.finished ? "listening" : "speaking");
    }
  };

  private addAudioBase64Chunk = async (chunk: string) => {
    this.output.gain.gain.value = this.volume;
    this.output.worklet.port.postMessage({ type: "clearInterrupted" });
    this.output.worklet.port.postMessage({
      type: "buffer",
      buffer: base64ToArrayBuffer(chunk),
    });
  };

  private fadeOutAudio = async () => {
    // mute agent
    this.updateMode("listening");
    this.output.worklet.port.postMessage({ type: "interrupt" });
    this.output.gain.gain.exponentialRampToValueAtTime(
      0.0001,
      this.output.context.currentTime + 2
    );

    // reset volume back
    setTimeout(() => {
      this.output.gain.gain.value = this.volume;
      this.output.worklet.port.postMessage({ type: "clearInterrupted" });
    }, 2000); // Adjust the duration as needed
  };

  private onError = (message: string, context?: any) => {
    console.error(message, context);
    this.options.onError(message, context);
  };

  private calculateVolume = (frequencyData: Uint8Array) => {
    if (frequencyData.length === 0) {
      return 0;
    }

    // TODO: Currently this averages all frequencies, but we should probably
    // bias towards the frequencies that are more typical for human voice
    let volume = 0;
    for (let i = 0; i < frequencyData.length; i++) {
      volume += frequencyData[i] / 255;
    }
    volume /= frequencyData.length;

    return volume < 0 ? 0 : volume > 1 ? 1 : volume;
  };

  public getId = () => this.connection.conversationId;

  public setVolume = ({ volume }: { volume: number }) => {
    this.volume = volume;
  };

  public getInputByteFrequencyData = () => {
    this.inputFrequencyData ??= new Uint8Array(
      this.input.analyser.frequencyBinCount
    );
    this.input.analyser.getByteFrequencyData(this.inputFrequencyData);
    return this.inputFrequencyData;
  };

  public getOutputByteFrequencyData = () => {
    this.outputFrequencyData ??= new Uint8Array(
      this.output.analyser.frequencyBinCount
    );
    this.output.analyser.getByteFrequencyData(this.outputFrequencyData);
    return this.outputFrequencyData;
  };

  public getInputVolume = () => {
    return this.calculateVolume(this.getInputByteFrequencyData());
  };

  public getOutputVolume = () => {
    return this.calculateVolume(this.getOutputByteFrequencyData());
  };

  public sendFeedback = (like: boolean) => {
    if (!this.canSendFeedback) {
      console.warn(
        this.lastFeedbackEventId === 0
          ? "Cannot send feedback: the conversation has not started yet."
          : "Cannot send feedback: feedback has already been sent for the current response."
      );
      return;
    }

    this.connection.sendMessage({
      type: "feedback",
      score: like ? "like" : "dislike",
      event_id: this.currentEventId,
    });
    this.lastFeedbackEventId = this.currentEventId;
    this.updateCanSendFeedback();
  };
}

export function postOverallFeedback(
  conversationId: string,
  like: boolean,
  origin: string = HTTPS_API_ORIGIN
) {
  return fetch(`${origin}/v1/convai/conversations/${conversationId}/feedback`, {
    method: "POST",
    body: JSON.stringify({
      feedback: like ? "like" : "dislike",
    }),
    headers: {
      "Content-Type": "application/json",
    },
  });
}
