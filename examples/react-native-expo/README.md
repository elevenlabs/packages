# ElevenLabs React Native SDK Example App

A comprehensive example application demonstrating the ElevenLabs React Native SDK for conversational AI. This app showcases all the advanced features including real-time audio processing, connection monitoring, and platform-specific configurations.

## 🚀 Features

### 🎙️ Conversation Management
- **Start/Stop Conversations**: Easy-to-use controls for managing voice conversations
- **Real-time Status**: Visual indicators for connection status and conversation mode
- **Message History**: Complete transcript of conversation with timestamps
- **Error Handling**: Comprehensive error display and recovery

### 🔊 Audio Controls
- **Volume Control**: Real-time volume adjustment with visual feedback
- **Microphone Toggle**: Enable/disable microphone during conversation
- **Speaker Toggle**: Switch between speaker and earpiece output
- **Audio Quality Settings**: Configure sample rate, encoding, and processing options

### 📊 Real-time Monitoring
- **Connection Quality**: Visual signal strength indicators
- **Audio Metrics**: Real-time input/output levels and audio processing status
- **Connection Statistics**: Latency, packet loss, jitter, and bandwidth monitoring
- **Debug Information**: Comprehensive debug panel for troubleshooting

### ⚙️ Advanced Configuration
- **Agent ID Management**: Easy configuration of ElevenLabs agent
- **Audio Quality Settings**: Sample rate, encoding, bitrate configuration
- **Platform-specific Settings**: iOS and Android audio session customization
- **Settings Persistence**: Local storage of user preferences
- **Export/Import Config**: Copy configuration for sharing or backup

## 📱 Screenshots

### Main Conversation Screen
- Real-time status indicators
- Audio controls with sliders and toggles
- Message history with user/agent distinction
- Clean, modern UI with haptic feedback

### Settings Screen
- Comprehensive audio quality configuration
- Platform-specific audio session settings
- Easy agent ID management
- Settings persistence and reset options

### Monitoring Dashboard
- Real-time connection quality visualization
- Audio metrics with detailed information
- Connection statistics and debug data
- Configuration summary and system info

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 20+ (Required for Expo SDK 53)
- Expo CLI: `npm install -g @expo/cli`
- ElevenLabs account with agent ID
- iOS Simulator or physical iOS device
- Android Emulator or physical Android device

### Installation

1. **Install Dependencies**
   ```bash
   cd packages/examples/react-native-expo
   pnpm install
   ```

   **Note**: The @elevenlabs/react-native SDK now includes all WebRTC dependencies. No need to install Livekit packages separately!

2. **Configure Your Agent**
   - Open the app
   - Go to Settings tab
   - Enter your ElevenLabs Agent ID
   - Configure audio quality settings as needed
   - Save settings

3. **Install Development Build**

   **Note**: This app requires a development build (not Expo Go) due to WebRTC native dependencies.

   For iOS:
   ```bash
   pnpm run ios
   ```

   For Android:
   ```bash
   pnpm run android
   ```

## 🎯 Usage Guide

### Starting Your First Conversation

1. **Configure Agent ID**
   - Navigate to Settings tab
   - Enter your ElevenLabs agent ID (replace 'your-agent-id')
   - Save settings

2. **Start Conversation**
   - Go to Conversation tab
   - Tap "Start Conversation"
   - Grant microphone permissions when prompted
   - Begin speaking when connected

3. **Monitor Performance**
   - Switch to Monitoring tab during conversation
   - View real-time connection quality
   - Monitor audio metrics and statistics

### Audio Configuration

#### Basic Settings
- **Sample Rate**: 8kHz - 48kHz (48kHz recommended)
- **Encoding**: Opus (recommended) or PCM
- **Bitrate**: 16kbps - 320kbps (64kbps recommended)

#### Audio Processing
- **Echo Cancellation**: Reduces echo feedback
- **Noise Suppression**: Filters background noise
- **Auto Gain Control**: Automatically adjusts input levels

#### Audio Routing
- **Output Route**: Auto, Speaker, Earpiece, or Bluetooth
- **Proximity Sensor**: Automatically switch to earpiece when near ear

### Platform-Specific Features

#### iOS Configuration
- **Audio Session Category**: playAndRecord, record, playback
- **Audio Session Mode**: voiceChat, videoChat, default
- **Default to Speaker**: Force speaker output on connection
- **Allow Bluetooth**: Enable Bluetooth audio devices

#### Android Configuration
- **Audio Focus**: Control how app handles audio focus
- **Focus Type**: gainTransient, gain, gainTransientMayDuck
- **Content Type**: speech, music, movie, sonification
- **Usage Type**: voiceCommunication, media, voiceRecognition

## 🔧 Advanced Features

### Settings Management
- **Local Persistence**: Settings automatically saved to device
- **Export Configuration**: Copy settings as JSON for backup
- **Reset to Defaults**: Restore all settings to recommended values
- **Platform Detection**: Automatic iOS/Android specific settings

### Error Handling
- **Connection Errors**: Network and authentication failure handling
- **Permission Errors**: Clear guidance for microphone permissions
- **Audio Errors**: Device and processing error recovery
- **User Feedback**: Toast notifications and error dialogs

### Performance Monitoring
- **Real-time Metrics**: Updated every second during conversation
- **Connection Quality**: Excellent, Good, Poor, Unknown signal indicators
- **Audio Levels**: Input and output level visualization
- **Statistics Tracking**: Comprehensive connection and audio statistics

## 🐛 Troubleshooting

### Common Issues

#### "Agent ID not configured"
- Solution: Set your actual ElevenLabs agent ID in Settings

#### "Microphone permission denied"
- Solution: Enable microphone permission in device settings
- iOS: Settings > Privacy & Security > Microphone > [App Name]
- Android: Settings > Apps > [App Name] > Permissions > Microphone

#### "Failed to start conversation"
- Check internet connection
- Verify agent ID is correct
- Ensure agent is active in ElevenLabs console
- Check if another audio app is using microphone

#### Poor audio quality
- Increase sample rate to 48kHz
- Use Opus encoding
- Enable audio processing features
- Check network connection quality

### Debug Information

The Monitoring screen provides comprehensive debug information:
- **Connection Statistics**: Latency, packet loss, jitter
- **Audio Metrics**: Sample rates, codecs, processing status
- **Configuration Summary**: Current settings overview
- **Error Logs**: Last error message and context

## 🎨 Customization

### UI Theming
The app uses a clean, modern design with:
- Material Design icons
- Consistent color scheme (#007AFF primary)
- Responsive layouts for different screen sizes
- Dark/light theme support (iOS system preference)

### Adding Features
The app is built with a modular architecture:
- **Context-based State Management**: Centralized conversation state
- **Screen-based Navigation**: Easy to add new screens
- **Component Reusability**: Reusable UI components
- **Type Safety**: Full TypeScript support

## 📖 API Reference

The example app demonstrates all features of the ElevenLabs React Native SDK:

```typescript
import { Conversation, registerGlobals } from '@elevenlabs/react-native';

// Required: Register globals for WebRTC
registerGlobals();

// Start conversation with full configuration
const conversation = await Conversation.startSession({
  agentId: 'your-agent-id',
  audioQuality: {
    sampleRate: 48000,
    encoding: 'opus',
    bitrate: 64,
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  audioRouting: {
    outputRoute: 'auto',
    useProximitySensor: true,
  },
  reactNative: {
    autoRequestPermissions: true,
    handleAppStateChanges: true,
    pauseOnBackground: true,
  },
  onConnect: ({ conversationId }) => console.log('Connected'),
  onMessage: ({ message, source }) => console.log('Message:', message),
  onStatusChange: ({ status }) => console.log('Status:', status),
  // ... additional callbacks
});

// Control audio during conversation
await conversation.setVolumeAndRouting(0.8, { outputRoute: 'speaker' });
await conversation.setMicrophoneEnabled(false);
await conversation.setSpeakerOutput(true);

// Monitor connection
const quality = conversation.getConnectionQuality();
const metrics = conversation.getAudioMetrics();
const stats = conversation.getConnectionStats();

// End conversation
await conversation.endSession();
```

## 🔗 Resources

- [ElevenLabs Documentation](https://elevenlabs.io/docs)
- [React Native Documentation](https://reactnative.dev)
- [Expo Documentation](https://docs.expo.dev)
- [Livekit React Native SDK](https://docs.livekit.io/client-sdk-react-native/)

## 📄 License

This example app is part of the ElevenLabs packages monorepo and is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please refer to the main repository's contributing guidelines.

---

**Note**: This example requires a development build due to WebRTC native dependencies. It cannot run in Expo Go.