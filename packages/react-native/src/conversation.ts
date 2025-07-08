import { Room, RoomEvent, ConnectionState, Track } from 'livekit-client';
import { AudioSession } from '@livekit/react-native';
import type {
  Options,
  PartialOptions,
  Status,
  Mode,
  Role,
  DisconnectionDetails,
  ClientToolCallEvent,
} from './types';
import { ConversationError, ErrorCodes } from './errors';

export class Conversation {
  private room?: Room;
  private status: Status = 'disconnected';
  private mode: Mode = 'listening';
  private conversationId = '';
  private options: Options;

  private constructor(options: Options) {
    this.options = options;
  }

  /**
   * Start a new conversation session
   */
  public static async startSession(partialOptions: PartialOptions): Promise<Conversation> {
    const options = Conversation.getFullOptions(partialOptions);
    const conversation = new Conversation(options);

    // Validate authentication
    if (!options.conversationToken && !options.agentId && !options.signedUrl) {
      throw new ConversationError(
        ErrorCodes.AUTHENTICATION_FAILED,
        'Either conversationToken, agentId, or signedUrl is required'
      );
    }

    try {
      options.onStatusChange?.({ status: 'connecting' });
      await conversation.initialize();
      return conversation;
    } catch (error) {
      options.onStatusChange?.({ status: 'disconnected' });
      throw new ConversationError(
        ErrorCodes.CONNECTION_FAILED,
        `Failed to start conversation: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Initialize the conversation
   */
  private async initialize(): Promise<void> {
    // Start audio session
    await AudioSession.startAudioSession();

    // Initialize room
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });

    // Set up event listeners
    this.room
      .on(RoomEvent.Connected, this.handleConnected)
      .on(RoomEvent.Disconnected, this.handleDisconnected)
      .on(RoomEvent.ConnectionStateChanged, this.handleConnectionStateChanged)
      .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
      .on(RoomEvent.DataReceived, this.handleDataReceived);

    // Connect to conversation
    const { url, token } = await this.getConnectionDetails();
    await this.room.connect(url, token);

    // Enable microphone
    await this.room.localParticipant.setMicrophoneEnabled(true);
  }

  /**
   * Get connection details based on authentication method
   */
  private async getConnectionDetails(): Promise<{ url: string; token: string }> {
    if (this.options.conversationToken) {
      return {
        url: this.options.livekitUrl || 'wss://api.elevenlabs.io/v1/convai/conversation/ws',
        token: this.options.conversationToken,
      };
    }

    if (this.options.signedUrl) {
      const response = await fetch(this.options.signedUrl);
      const data = await response.json();
      return {
        url: data.url || this.options.livekitUrl || 'wss://api.elevenlabs.io/v1/convai/conversation/ws',
        token: data.token,
      };
    }

    if (this.options.agentId) {
      const response = await fetch('https://api.elevenlabs.io/v1/convai/conversation/get_signed_url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.options.authorization && { Authorization: this.options.authorization }),
        },
        body: JSON.stringify({
          agent_id: this.options.agentId,
          overrides: this.options.overrides,
          dynamic_variables: this.options.dynamicVariables,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get signed URL: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        url: data.url || this.options.livekitUrl || 'wss://api.elevenlabs.io/v1/convai/conversation/ws',
        token: data.token,
      };
    }

    throw new ConversationError(ErrorCodes.AUTHENTICATION_FAILED, 'No valid authentication method provided');
  }

  /**
   * Event handlers
   */
  private handleConnected = (): void => {
    this.conversationId = this.room?.name || 'unknown';
    this.setStatus('connected');
    this.options.onConnect?.({ conversationId: this.conversationId });
  };

  private handleDisconnected = (reason?: unknown): void => {
    const details: DisconnectionDetails = reason
      ? { reason: 'error', message: String(reason), context: {} }
      : { reason: 'user' };
    this.setStatus('disconnected');
    this.options.onDisconnect?.(details);
  };

  private handleConnectionStateChanged = (state: ConnectionState): void => {
    switch (state) {
      case ConnectionState.Connecting:
      case ConnectionState.Reconnecting:
        this.setStatus('connecting');
        break;
      case ConnectionState.Connected:
        this.setStatus('connected');
        break;
      case ConnectionState.Disconnected:
        this.setStatus('disconnected');
        break;
    }
  };

  private handleTrackSubscribed = (track: Track): void => {
    if (track.kind === Track.Kind.Audio) {
      track.attach();
    }
  };

  private handleDataReceived = (payload: Uint8Array): void => {
    try {
      const data = JSON.parse(new TextDecoder().decode(payload));

      if (data.type === 'conversation.message') {
        this.options.onMessage?.({
          message: data.message,
          source: data.source as Role,
        });
      }

      if (data.type === 'conversation.mode_change') {
        this.setMode(data.mode);
      }

      if (data.type === 'client_tool_call') {
        this.handleClientToolCall(data);
      }
    } catch (error) {
      console.warn('Failed to parse received data:', error);
    }
  };

  /**
   * Handle client tool calls
   */
  private async handleClientToolCall(event: ClientToolCallEvent): Promise<void> {
    const { tool_name, tool_call_id, parameters } = event;

    if (this.options.clientTools?.[tool_name]) {
      try {
        const result = await this.options.clientTools[tool_name](parameters) || 'Tool execution successful';
        const formattedResult = typeof result === 'object' ? JSON.stringify(result) : String(result);

        this.sendData({
          type: 'client_tool_result',
          tool_call_id,
          result: formattedResult,
          is_error: false,
        });
      } catch (error) {
        this.sendData({
          type: 'client_tool_result',
          tool_call_id,
          result: `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`,
          is_error: true,
        });
      }
    } else {
      this.options.onUnhandledClientToolCall?.(event);
    }
  }

  /**
   * Set conversation status
   */
  private setStatus(status: Status): void {
    if (this.status !== status) {
      this.status = status;
      this.options.onStatusChange?.({ status });
    }
  }

  /**
   * Set conversation mode
   */
  private setMode(mode: Mode): void {
    if (this.mode !== mode) {
      this.mode = mode;
      this.options.onModeChange?.({ mode });
    }
  }

  /**
   * Send data to the conversation
   */
  private async sendData(data: Record<string, unknown>): Promise<void> {
    if (!this.room || !this.isOpen()) {
      throw new ConversationError(ErrorCodes.CONNECTION_FAILED, 'Conversation is not connected');
    }

    try {
      await this.room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify(data)),
        { reliable: true }
      );
    } catch (error) {
      throw new ConversationError(
        ErrorCodes.NETWORK_ERROR,
        `Failed to send data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get full options with defaults
   */
  private static getFullOptions(partialOptions: PartialOptions): Options {
    return {
      clientTools: {},
      onConnect: () => {},
      onDisconnect: () => {},
      onError: () => {},
      onMessage: () => {},
      onAudio: () => {},
      onModeChange: () => {},
      onStatusChange: () => {},
      onCanSendFeedbackChange: () => {},
      ...partialOptions,
    };
  }

  /**
   * Public API methods
   */
  public async endSession(): Promise<void> {
    this.setStatus('disconnecting');

    try {
      this.room?.disconnect();
      this.room = undefined;
      await AudioSession.stopAudioSession();
      this.setStatus('disconnected');
    } catch (error) {
      console.warn('Error ending session:', error);
    }
  }

  public getStatus(): Status {
    return this.status;
  }

  public getMode(): Mode {
    return this.mode;
  }

  public getId(): string {
    return this.conversationId;
  }

  public isOpen(): boolean {
    return this.status === 'connected';
  }

  public async sendMessage(message: string): Promise<void> {
    await this.sendData({
      type: 'user_message',
      text: message,
    });
  }

  public async setMicrophoneMuted(muted: boolean): Promise<void> {
    if (this.room) {
      await this.room.localParticipant.setMicrophoneEnabled(!muted);
    }
  }

  public setVolume(_volume: number): void {
    // Volume control would be handled by Livekit's audio output
    // This is a placeholder for API consistency
  }
}
