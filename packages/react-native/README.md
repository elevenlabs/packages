# ElevenLabs React Native SDK

A comprehensive React Native SDK for ElevenLabs Conversational AI, providing WebRTC-only interface optimized for mobile applications.

## 🚀 Features

### Core Functionality
- **WebRTC-Only Communication**: Optimized for React Native with Livekit integration
- **Real-time Voice Conversations**: Low-latency audio processing with AI agents
- **Client Tools Support**: Extensible function calling from AI agents
- **Advanced Audio Management**: Comprehensive audio quality and routing controls
- **Platform-Specific Optimizations**: iOS and Android native integrations

### Audio Excellence
- **High-Quality Audio Processing**: Opus encoding with up to 48kHz sample rates
- **Echo Cancellation & Noise Suppression**: Advanced audio processing features
- **Adaptive Audio Routing**: Automatic speaker/earpiece/Bluetooth switching
- **Real-time Audio Monitoring**: Input/output level visualization and metrics
- **Background Audio Handling**: Proper app lifecycle management

### Developer Experience
- **TypeScript First**: Full type safety with comprehensive interfaces
- **React Native Optimized**: Built specifically for React Native environments
- **Expo Compatible**: Works with Expo development builds (not Expo Go)
- **Comprehensive Monitoring**: Connection quality, audio metrics, and diagnostics
- **Error Handling**: Robust error recovery and user feedback

## 📦 Installation

```bash
npm install @elevenlabs/react-native
# or
yarn add @elevenlabs/react-native
# or
pnpm add @elevenlabs/react-native
```

That's it! All required dependencies including Livekit are bundled with the SDK.

### React Native Configuration

Add the following to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "@livekit/react-native-expo-plugin",
        {
          "android": {
            "enableAudioFocus": true,
            "enableAudioManager": true
          },
          "ios": {
            "enableBackgroundAudio": true
          }
        }
      ]
    ]
  }
}
```

## 🎯 Quick Start

### Basic Usage

```typescript
import { Conversation, registerGlobals } from '@elevenlabs/react-native';

// Required: Register globals for WebRTC functionality
registerGlobals();

const startConversation = async () => {
  const conversation = await Conversation.startSession({
    agentId: 'your-agent-id',
    onConnect: ({ conversationId }) => {
      console.log('Connected:', conversationId);
    },
    onMessage: ({ message, source }) => {
      console.log(`${source}: ${message}`);
    },
    onStatusChange: ({ status }) => {
      console.log('Status:', status);
    },
    onError: (error) => {
      console.error('Error:', error);
    },
  });

  return conversation;
};
```

### Advanced Configuration

```typescript
const conversation = await Conversation.startSession({
  agentId: 'your-agent-id',

  // Audio Quality Settings
  audioQuality: {
    sampleRate: 48000,
    encoding: 'opus',
    bitrate: 64,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },

  // Audio Routing
  audioRouting: {
    outputRoute: 'auto',
    useProximitySensor: true,
  },

  // React Native Specific Options
  reactNative: {
    autoRequestPermissions: true,
    handleAppStateChanges: true,
    pauseOnBackground: true,
    iosAudioSession: {
      category: 'playAndRecord',
      mode: 'voiceChat',
      options: {
        defaultToSpeaker: false,
        allowBluetooth: true,
      },
    },
    androidAudio: {
      requestAudioFocus: true,
      audioFocusType: 'gainTransient',
      contentType: 'speech',
      usage: 'voiceCommunication',
    },
  },

  // Client Tools
  clientTools: {
    get_current_time: async () => new Date().toLocaleString(),
    calculate: async ({ expression }) => {
      // Safe calculation implementation
      return `Result: ${eval(expression)}`;
    },
  },

  // Event Handlers
  onConnect: ({ conversationId }) => console.log('Connected'),
  onMessage: ({ message, source }) => console.log(message),
  onError: (error) => console.error(error),
  onPermissionDenied: () => console.log('Microphone permission denied'),
});
```

## 🎛️ API Reference

### Conversation Class

#### Static Methods

##### `startSession(options: PartialOptions): Promise<Conversation>`

Starts a new conversation session with the specified configuration.

**Parameters:**
- `options`: Configuration object with conversation settings

**Returns:**
- `Promise<Conversation>`: The conversation instance

**Example:**
```typescript
const conversation = await Conversation.startSession({
  agentId: 'your-agent-id',
  onConnect: ({ conversationId }) => console.log('Connected'),
});
```

#### Instance Methods

##### `endSession(): Promise<void>`

Ends the current conversation session and cleans up all resources.

```typescript
await conversation.endSession();
```

##### `setVolumeAndRouting(volume: number, routing?: AudioRouting): Promise<void>`

Controls audio volume and routing options.

**Parameters:**
- `volume`: Audio volume (0.0 - 1.0)
- `routing`: Optional audio routing configuration

```typescript
await conversation.setVolumeAndRouting(0.8, {
  outputRoute: 'speaker',
  forceSpeaker: true,
});
```

##### `setMicrophoneEnabled(enabled: boolean): Promise<void>`

Enables or disables the microphone during conversation.

```typescript
await conversation.setMicrophoneEnabled(false); // Mute
await conversation.setMicrophoneEnabled(true);  // Unmute
```

##### `isMicrophoneEnabled(): boolean`

Returns the current microphone state.

```typescript
const isMuted = !conversation.isMicrophoneEnabled();
```

##### `setSpeakerOutput(enabled: boolean): Promise<void>`

Forces speaker output (useful for hands-free operation).

```typescript
await conversation.setSpeakerOutput(true); // Force speaker
```

##### `getConnectionQuality(): ConnectionQuality`

Returns current connection quality metrics.

```typescript
const quality = conversation.getConnectionQuality();
console.log(`Signal: ${quality.signal}, Latency: ${quality.latency}ms`);
```

##### `getConnectionDiagnostics(): ConnectionDiagnostics`

Returns comprehensive connection diagnostics including health scores.

```typescript
const diagnostics = conversation.getConnectionDiagnostics();
console.log(`Health Score: ${diagnostics.healthScore?.overall}%`);
console.log(`Network Type: ${diagnostics.networkType}`);
```

##### `getAudioMetrics(): AudioMetrics`

Returns detailed audio processing metrics.

```typescript
const metrics = conversation.getAudioMetrics();
console.log(`Input Level: ${metrics.inputLevel}`);
console.log(`Sample Rate: ${metrics.sampleRate}Hz`);
```

##### `getRealtimeAudioLevels(): { input: number; output: number }`

Returns real-time audio levels for UI visualization.

```typescript
const levels = conversation.getRealtimeAudioLevels();
// Update UI with levels.input and levels.output (0.0 - 1.0)
```

##### `getConnectionStats(): Record<string, unknown>`

Returns detailed connection statistics for monitoring.

```typescript
const stats = conversation.getConnectionStats();
console.log('Connection Stats:', stats);
```

## 🛠️ Client Tools

Client tools allow AI agents to invoke functions on the client side. This enables powerful integrations with device capabilities and app-specific functionality.

### Defining Client Tools

```typescript
const clientTools = {
  // Simple tool without parameters
  get_current_time: async (): Promise<string> => {
    return new Date().toLocaleString();
  },

  // Tool with parameters
  calculate: async (params: Record<string, unknown>): Promise<string> => {
    const expression = params.expression as string;
    if (!expression) {
      return 'Error: Expression parameter required';
    }

    try {
      // Implement safe calculation
      const result = evaluateExpression(expression);
      return `${expression} = ${result}`;
    } catch (error) {
      return `Error: ${error.message}`;
    }
  },

  // Device integration tool
  trigger_haptic_feedback: async (params: Record<string, unknown>): Promise<string> => {
    const type = params.type as string || 'medium';

    if (Platform.OS === 'ios') {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      return `Triggered ${type} haptic feedback`;
    }

    return 'Haptic feedback not available on this platform';
  },
};
```

### Best Practices for Client Tools

1. **Error Handling**: Always handle errors gracefully and return meaningful messages
2. **Parameter Validation**: Validate all input parameters
3. **Async Operations**: Use async/await for any asynchronous operations
4. **Platform Checks**: Check platform compatibility for platform-specific features
5. **Security**: Never execute arbitrary code or expose sensitive functionality

### Example Tool Categories

#### Device Information
- `get_device_info`: Returns platform, version, and screen information
- `get_screen_info`: Returns screen dimensions and orientation

#### Time and Date
- `get_current_time`: Returns current time in various formats
- `calculate_time_difference`: Calculates time between dates

#### Text Processing
- `analyze_text`: Analyzes word count, character count, etc.
- `copy_to_clipboard`: Copies text to device clipboard

#### Mathematical Operations
- `calculate`: Performs safe arithmetic calculations
- `convert_units`: Converts between different units

## 📱 Platform Integration

### iOS Configuration

#### Audio Session Setup

```typescript
reactNative: {
  iosAudioSession: {
    category: 'playAndRecord',
    mode: 'voiceChat',
    options: {
      defaultToSpeaker: false,
      allowBluetooth: true,
      allowAirPlay: true,
      mixWithOthers: false,
    },
  },
}
```

#### Permissions

Add to `Info.plist`:
```xml
<key>NSMicrophoneUsageDescription</key>
<string>This app uses the microphone for voice conversations with AI agents.</string>
```

### Android Configuration

#### Audio Focus Management

```typescript
reactNative: {
  androidAudio: {
    requestAudioFocus: true,
    audioFocusType: 'gainTransient',
    contentType: 'speech',
    usage: 'voiceCommunication',
  },
}
```

#### Permissions

Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.RECORD_AUDIO" />
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

## 🔍 Monitoring and Diagnostics

### Connection Monitoring

```typescript
// Basic connection quality
const quality = conversation.getConnectionQuality();
console.log(`Signal: ${quality.signal}`);
console.log(`Latency: ${quality.latency}ms`);

// Comprehensive diagnostics
const diagnostics = conversation.getConnectionDiagnostics();
console.log(`Health Score: ${diagnostics.healthScore?.overall}%`);
console.log(`Network Type: ${diagnostics.networkType}`);
console.log(`WebRTC State: ${diagnostics.webrtc?.iceConnectionState}`);
```

### Audio Monitoring

```typescript
// Real-time audio levels
const levels = conversation.getRealtimeAudioLevels();
updateVolumeIndicator(levels.input, levels.output);

// Detailed audio metrics
const metrics = conversation.getAudioMetrics();
console.log(`Sample Rate: ${metrics.sampleRate}Hz`);
console.log(`Codec: ${metrics.codec}`);
console.log(`Processing: ${JSON.stringify(metrics.processing)}`);
```

### Performance Monitoring

```typescript
// Connection statistics
const stats = conversation.getConnectionStats();
console.log('Performance Stats:', {
  connectionState: stats.connectionState,
  participantCount: stats.participantCount,
  hasAudioPermission: stats.hasAudioPermission,
});
```

## 🎯 Best Practices

### Conversation Management

1. **Proper Cleanup**: Always call `endSession()` when done
2. **Error Handling**: Implement comprehensive error handling
3. **Permission Management**: Handle permission states gracefully
4. **Background Handling**: Configure app state management appropriately

```typescript
// Proper conversation lifecycle
useEffect(() => {
  let conversation: Conversation | null = null;

  const startConv = async () => {
    conversation = await Conversation.startSession({
      // ... configuration
    });
  };

  // Cleanup on unmount
  return () => {
    if (conversation) {
      conversation.endSession().catch(console.error);
    }
  };
}, []);
```

### Audio Quality Optimization

```typescript
// Optimized audio settings
const audioQuality: AudioQualitySettings = {
  sampleRate: 48000,    // High quality
  encoding: 'opus',     // Efficient compression
  bitrate: 64,          // Balanced quality/bandwidth
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};
```

### Error Recovery

```typescript
const handleError = (error: string, context?: Record<string, unknown>) => {
  console.error('Conversation error:', error, context);

  // Show user-friendly message
  if (error.includes('permission')) {
    showPermissionError();
  } else if (error.includes('network')) {
    showNetworkError();
  } else {
    showGenericError();
  }

  // Attempt recovery if appropriate
  if (shouldAttemptReconnect(error)) {
    setTimeout(attemptReconnect, 5000);
  }
};
```

## 🚨 Troubleshooting

### Common Issues

#### Permission Denied
```typescript
onPermissionDenied: () => {
  Alert.alert(
    'Microphone Required',
    'Please enable microphone access in device settings to use voice features.',
    [
      { text: 'Cancel' },
      { text: 'Settings', onPress: () => Linking.openSettings() },
    ]
  );
}
```

#### Connection Issues
```typescript
onError: (error) => {
  if (error.includes('authentication')) {
    // Check agent ID and API keys
  } else if (error.includes('network')) {
    // Check internet connection
  } else if (error.includes('webrtc')) {
    // Check WebRTC compatibility
  }
}
```

#### Audio Issues
- Ensure proper audio session configuration
- Check for conflicting audio apps
- Verify device audio capabilities
- Monitor audio levels and metrics

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
// Enable debug logging
console.log('Conversation State:', {
  status: conversation.getStatus(),
  mode: conversation.getMode(),
  isOpen: conversation.isOpen(),
  quality: conversation.getConnectionQuality(),
});
```

## 📚 Examples

Check out the comprehensive example app in `examples/react-native-expo/` which demonstrates:

- Complete conversation management
- All client tools with interactive UI
- Real-time monitoring dashboard
- Settings management with persistence
- Platform-specific configurations

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [ElevenLabs API Documentation](https://elevenlabs.io/docs)
- [React Native Documentation](https://reactnative.dev)
- [Livekit React Native SDK](https://docs.livekit.io/client-sdk-react-native/)
- [Example App](examples/react-native-expo/)

## 📞 Support

For support and questions:
- [ElevenLabs Discord](https://discord.gg/elevenlabs)
- [GitHub Issues](https://github.com/elevenlabs/packages/issues)
- [Documentation](https://elevenlabs.io/docs)