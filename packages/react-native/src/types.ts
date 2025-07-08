// ElevenLabs React Native SDK Types
// Based on packages/client but adapted for React Native WebRTC-only approach

/**
 * Role in the conversation - consistent with client SDK
 */
export type Role = "user" | "ai";

/**
 * Current mode of the conversation - consistent with client SDK
 */
export type Mode = "speaking" | "listening";

/**
 * Status of the conversation connection - consistent with client SDK
 */
export type Status =
  | "connecting"
  | "connected"
  | "disconnecting"
  | "disconnected";

/**
 * Language support - aligned with client SDK
 */
export type Language =
  | "en"
  | "ja"
  | "zh"
  | "de"
  | "hi"
  | "fr"
  | "ko"
  | "pt"
  | "pt-br"
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
  | "hr"
  | "sk"
  | "no"
  | "vi";

/**
 * Client tools configuration - consistent with client SDK
 */
export type ClientToolsConfig = {
  clientTools: Record<
    string,
    (
      parameters: Record<string, unknown>
    ) => Promise<string | number | undefined> | string | number | undefined
  >;
};

/**
 * Callbacks configuration - aligned with client SDK but adapted for React Native
 */
export type Callbacks = {
  onConnect: (props: { conversationId: string }) => void;
  onDisconnect: (details: DisconnectionDetails) => void;
  onError: (message: string, context?: Record<string, unknown>) => void;
  onMessage: (props: { message: string; source: Role }) => void;
  onAudio: (base64Audio: string) => void;
  onModeChange: (prop: { mode: Mode }) => void;
  onStatusChange: (prop: { status: Status }) => void;
  onCanSendFeedbackChange: (prop: { canSendFeedback: boolean }) => void;
  onUnhandledClientToolCall?: (params: ClientToolCallEvent) => void;
  // React Native specific callbacks
  onPermissionRequested?: () => void;
  onPermissionGranted?: () => void;
  onPermissionDenied?: () => void;
};

/**
 * Disconnection details - consistent with client SDK
 */
export type DisconnectionDetails =
  | {
      reason: "error";
      message: string;
      context: Record<string, unknown>;
    }
  | {
      reason: "agent";
      context: Record<string, unknown>;
    }
  | {
      reason: "user";
    };

/**
 * React Native specific session configuration
 */
export type ReactNativeSessionConfig = {
  /** Agent ID for public agents */
  agentId?: string;
  /** Signed URL for authenticated agents */
  signedUrl?: string;
  /** Conversation token for WebRTC authentication */
  conversationToken?: string;
  /** LiveKit server URL override */
  livekitUrl?: string;
  /** Custom authorization header */
  authorization?: string;
  /** Override agent settings */
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
  /** Dynamic variables for the conversation */
  dynamicVariables?: Record<string, string | number | boolean>;
  /** Audio quality settings */
  audioQuality?: AudioQualitySettings;
  /** Audio routing preferences */
  audioRouting?: AudioRouting;
  /** React Native specific options */
  reactNative?: {
    /** Request microphone permissions automatically */
    autoRequestPermissions?: boolean;
    /** iOS audio session configuration */
    iosAudioSession?: IOSAudioSessionConfig;
    /** Android audio configuration */
    androidAudio?: AndroidAudioConfig;
    /** Handle app background/foreground state changes */
    handleAppStateChanges?: boolean;
    /** Pause conversation when app goes to background */
    pauseOnBackground?: boolean;
    /** Resume conversation when app comes to foreground */
    resumeOnForeground?: boolean;
  };
};

/**
 * Full options type - combination of all configurations
 */
export type Options = ReactNativeSessionConfig & Callbacks & ClientToolsConfig;

/**
 * Partial options for easier usage - consistent with client SDK
 */
export type PartialOptions = ReactNativeSessionConfig &
  Partial<Callbacks> &
  Partial<ClientToolsConfig>;

/**
 * Client tool call event - aligned with client SDK
 */
export interface ClientToolCallEvent {
  tool_name: string;
  tool_call_id: string;
  parameters: Record<string, unknown>;
}

/**
 * Legacy type aliases for backward compatibility
 */
export type ConversationConfig = PartialOptions;
export type ConversationStatus = Status;
export type ConversationMode = Mode;
export interface ConversationMessage {
  message: string;
  source: Role;
}
export interface ConversationError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
export type ClientTools = ClientToolsConfig["clientTools"];

/**
 * Audio quality settings for WebRTC
 */
export interface AudioQualitySettings {
  /** Sample rate in Hz (8000, 16000, 44100, 48000) */
  sampleRate?: number;
  /** Audio encoding format */
  encoding?: "opus" | "pcm";
  /** Audio bitrate in kbps */
  bitrate?: number;
  /** Enable echo cancellation */
  echoCancellation?: boolean;
  /** Enable noise suppression */
  noiseSuppression?: boolean;
  /** Enable auto gain control */
  autoGainControl?: boolean;
}

/**
 * Audio routing options for React Native
 */
export interface AudioRouting {
  /** Preferred audio output route */
  outputRoute?: "speaker" | "earpiece" | "bluetooth" | "auto";
  /** Force speaker output */
  forceSpeaker?: boolean;
  /** Enable proximity sensor for automatic routing */
  useProximitySensor?: boolean;
}

/**
 * iOS-specific audio session configuration
 */
export interface IOSAudioSessionConfig {
  /** Audio session category */
  category?:
    | "ambient"
    | "soloAmbient"
    | "playback"
    | "record"
    | "playAndRecord"
    | "multiRoute";
  /** Audio session mode */
  mode?:
    | "default"
    | "voiceChat"
    | "videoChat"
    | "gameChat"
    | "measurement"
    | "moviePlayback"
    | "videoRecording";
  /** Audio session options */
  options?: {
    /** Mix with other audio */
    mixWithOthers?: boolean;
    /** Duck other audio */
    duckOthers?: boolean;
    /** Allow Bluetooth */
    allowBluetooth?: boolean;
    /** Allow Bluetooth A2DP */
    allowBluetoothA2DP?: boolean;
    /** Allow AirPlay */
    allowAirPlay?: boolean;
    /** Default to speaker */
    defaultToSpeaker?: boolean;
  };
}

/**
 * Android-specific audio configuration
 */
export interface AndroidAudioConfig {
  /** Request audio focus */
  requestAudioFocus?: boolean;
  /** Audio focus type */
  audioFocusType?: "gain" | "gainTransient" | "gainTransientMayDuck";
  /** Audio stream type */
  streamType?: "voiceCall" | "music" | "ring" | "alarm" | "notification";
  /** Audio content type */
  contentType?: "speech" | "music" | "movie" | "sonification";
  /** Audio usage */
  usage?:
    | "media"
    | "voiceCommunication"
    | "voiceCommunicationSignalling"
    | "alarm"
    | "notification";
}

/**
 * Connection quality metrics with detailed information
 */
export interface ConnectionQuality {
  /** Overall signal quality */
  signal: "excellent" | "good" | "poor" | "unknown";
  /** Round-trip latency in milliseconds */
  latency?: number;
  /** Packet loss percentage (0-100) */
  packetLoss?: number;
  /** Jitter in milliseconds */
  jitter?: number;
  /** Available bandwidth in kbps */
  bandwidth?: number;
  /** Connection state from Livekit */
  connectionState?:
    | "connecting"
    | "connected"
    | "reconnecting"
    | "disconnected";
}

/**
 * Enhanced connection diagnostics with detailed network analysis
 */
export interface ConnectionDiagnostics {
  /** Basic connection quality */
  quality: ConnectionQuality;
  /** Network type detection */
  networkType?: "wifi" | "cellular" | "ethernet" | "unknown";
  /** Detailed connection metrics */
  metrics: {
    /** Connection establishment time in ms */
    connectionTime?: number;
    /** Time since last successful data exchange */
    lastDataExchange?: number;
    /** Number of connection attempts */
    connectionAttempts?: number;
    /** Number of successful reconnections */
    reconnectionCount?: number;
    /** Current data transfer rates */
    dataRates?: {
      /** Bytes per second sent */
      bytesSent?: number;
      /** Bytes per second received */
      bytesReceived?: number;
      /** Packets per second sent */
      packetsSent?: number;
      /** Packets per second received */
      packetsReceived?: number;
    };
  };
  /** WebRTC specific statistics */
  webrtc?: {
    /** ICE connection state */
    iceConnectionState?: string;
    /** ICE gathering state */
    iceGatheringState?: string;
    /** Selected candidate pair information */
    selectedCandidatePair?: {
      local?: string;
      remote?: string;
      type?: string;
    };
    /** DTLS transport state */
    dtlsState?: string;
    /** Audio codec information */
    audioCodec?: {
      name?: string;
      clockRate?: number;
      channels?: number;
      sdpFmtpLine?: string;
    };
  };
  /** Performance indicators */
  performance?: {
    /** CPU usage percentage (0-100) */
    cpuUsage?: number;
    /** Memory usage in MB */
    memoryUsage?: number;
    /** Audio processing latency */
    audioLatency?: number;
    /** Frame rate for audio processing */
    audioFrameRate?: number;
  };
  /** Health score calculation */
  healthScore?: {
    /** Overall health score (0-100) */
    overall?: number;
    /** Individual component scores */
    components?: {
      network?: number;
      audio?: number;
      processing?: number;
      stability?: number;
    };
  };
}

/**
 * Comprehensive audio metrics for monitoring
 */
export interface AudioMetrics {
  /** Input audio level (0-1) */
  inputLevel?: number;
  /** Output audio level (0-1) */
  outputLevel?: number;
  /** Current sample rate in Hz */
  sampleRate?: number;
  /** Input frequency data for visualization */
  inputFrequencyData?: Uint8Array;
  /** Output frequency data for visualization */
  outputFrequencyData?: Uint8Array;
  /** Audio codec being used */
  codec?: string;
  /** Current bitrate in kbps */
  bitrate?: number;
  /** Audio processing stats */
  processing?: {
    /** Echo cancellation active */
    echoCancellation?: boolean;
    /** Noise suppression active */
    noiseSuppression?: boolean;
    /** Auto gain control active */
    autoGainControl?: boolean;
  };
}

/**
 * Performance monitoring and optimization settings
 */
export interface PerformanceConfig {
  /** Enable performance monitoring */
  enableMonitoring?: boolean;
  /** Audio buffer size optimization */
  audioBufferOptimization?: {
    /** Target buffer size in samples */
    targetBufferSize?: number;
    /** Enable adaptive buffering */
    adaptiveBuffering?: boolean;
    /** Maximum buffer size */
    maxBufferSize?: number;
    /** Minimum buffer size */
    minBufferSize?: number;
  };
  /** Memory management settings */
  memoryManagement?: {
    /** Enable garbage collection hints */
    enableGCHints?: boolean;
    /** Memory pressure threshold (MB) */
    memoryPressureThreshold?: number;
    /** Auto-cleanup inactive resources */
    autoCleanup?: boolean;
  };
  /** CPU optimization */
  cpuOptimization?: {
    /** Enable background processing */
    backgroundProcessing?: boolean;
    /** CPU usage threshold (0-100) */
    cpuThreshold?: number;
    /** Frame rate limiting */
    frameRateLimit?: number;
  };
}

/**
 * Real-time performance metrics
 */
export interface PerformanceMetrics {
  /** Current timestamp */
  timestamp: number;
  /** Memory usage information */
  memory?: {
    /** Used memory in MB */
    used?: number;
    /** Available memory in MB */
    available?: number;
    /** Memory pressure level */
    pressure?: "low" | "medium" | "high" | "critical";
  };
  /** CPU usage information */
  cpu?: {
    /** CPU usage percentage (0-100) */
    usage?: number;
    /** Audio processing CPU usage */
    audioProcessing?: number;
    /** Network processing CPU usage */
    networkProcessing?: number;
  };
  /** Audio processing metrics */
  audio?: {
    /** Current buffer size */
    bufferSize?: number;
    /** Buffer utilization (0-100) */
    bufferUtilization?: number;
    /** Audio glitches count */
    glitchCount?: number;
    /** Processing latency in ms */
    processingLatency?: number;
    /** Frame drops count */
    frameDrops?: number;
  };
  /** Network performance */
  network?: {
    /** Data transfer rate in bytes/sec */
    transferRate?: number;
    /** Queue depth */
    queueDepth?: number;
    /** Congestion level (0-100) */
    congestionLevel?: number;
  };
}
