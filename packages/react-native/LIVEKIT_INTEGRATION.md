# LiveKit Integration Plan

## Current Status ✅

**Working Foundation**: The SDK now provides a clean hook-only interface without PlatformConstants errors:
- `ElevenLabsProvider` - Context provider ready for LiveKit integration
- `useElevenLabsConversation` - Full hook interface with real ElevenLabs API integration
- Token generation from ElevenLabs API working
- Type-safe TypeScript interfaces
- Zero platform compatibility issues

## Phase 1: Native LiveKit Integration 🚧

### Step 1: Add LiveKit Dependencies
```bash
npm install @livekit/react-native @livekit/react-native-webrtc
```

### Step 2: Update ElevenLabsProvider
```typescript
// src/ElevenLabsProvider.tsx
import { registerGlobals, AudioSession } from '@livekit/react-native';
import { LiveKitRoom } from '@livekit/react-native';

// Register globals (do this ONCE at app startup)
registerGlobals();

export const ElevenLabsProvider: React.FC<Props> = ({ children, ...props }) => {
  useEffect(() => {
    // Start audio session
    AudioSession.startAudioSession();
    return () => AudioSession.stopAudioSession();
  }, []);

  return (
    <LiveKitRoom
      serverUrl="wss://livekit.rtc.elevenlabs.io"
      token=""
      connect={false}
      audio={true}
      video={false}
    >
      <ElevenLabsContext.Provider value={contextValue}>
        {children}
      </ElevenLabsContext.Provider>
    </LiveKitRoom>
  );
};
```

### Step 3: Hook Integration with LiveKit
```typescript
// src/useElevenLabsConversation.ts
import { useRoom, useParticipants, useRoomInfo } from '@livekit/react-native';

export const useElevenLabsConversation = () => {
  const room = useRoom();
  const participants = useParticipants();

  const startConversation = useCallback(async (config) => {
    // Get token from ElevenLabs (already implemented ✅)
    const token = config.conversationToken || await getConversationToken(config.agentId);

    // Connect via LiveKit
    await room.connect('wss://livekit.rtc.elevenlabs.io', token);

    // Set up data channel for conversation messages
    room.on('dataReceived', handleConversationData);

    // Enable microphone
    await room.localParticipant.setMicrophoneEnabled(true);
  }, []);

  // ... rest of implementation
};
```

## Phase 2: Advanced Features Integration

### Audio Controls
```typescript
const mute = useCallback(async () => {
  await room.localParticipant.setMicrophoneEnabled(false);
  setIsMuted(true);
}, [room]);

const setVolume = useCallback((volume: number) => {
  // LiveKit volume control through audio tracks
  const audioTracks = room.localParticipant.audioTracks;
  audioTracks.forEach(track => {
    if (track.audioTrack) {
      track.audioTrack.setVolume(volume);
    }
  });
}, [room]);
```

### Client Tools Integration
```typescript
const handleClientToolCall = useCallback(async (data) => {
  const { tool_name, tool_call_id, parameters } = data;
  const tools = configRef.current?.clientTools;

  if (tools?.[tool_name]) {
    try {
      const result = await tools[tool_name](parameters);

      // Send result back via data channel
      await room.localParticipant.publishData(
        new TextEncoder().encode(JSON.stringify({
          type: 'client_tool_result',
          tool_call_id,
          result: typeof result === 'object' ? JSON.stringify(result) : String(result),
          is_error: false,
        })),
        { reliable: true }
      );
    } catch (error) {
      // Send error response
      await room.localParticipant.publishData(/* error response */);
    }
  }
}, [room]);
```

### Connection Quality Monitoring
```typescript
const getConnectionQuality = useCallback(() => {
  const quality = room.connectionQuality;
  switch (quality) {
    case 'excellent': return 'excellent';
    case 'good': return 'good';
    default: return 'poor';
  }
}, [room]);
```

## Phase 3: React Native Platform Integration

### iOS Audio Session Configuration
```typescript
// Handle iOS audio session properly
useEffect(() => {
  if (Platform.OS === 'ios') {
    AudioSession.configureAudio({
      category: 'playAndRecord',
      mode: 'voiceChat',
      options: {
        defaultToSpeaker: false,
        allowBluetooth: true,
      }
    });
  }
}, []);
```

### Android Audio Focus
```typescript
// Handle Android audio focus
useEffect(() => {
  if (Platform.OS === 'android') {
    AudioSession.requestAudioFocus({
      focusType: 'gainTransient',
      contentType: 'speech',
      usage: 'voiceCommunication',
    });
  }
}, []);
```

### App State Management
```typescript
// Handle app backgrounding/foregrounding
useEffect(() => {
  const handleAppStateChange = (nextAppState: string) => {
    if (nextAppState === 'background' && isConnected) {
      // Pause conversation
      pauseConversation();
    } else if (nextAppState === 'active' && wasPaused) {
      // Resume conversation
      resumeConversation();
    }
  };

  AppState.addEventListener('change', handleAppStateChange);
  return () => AppState.removeEventListener('change', handleAppStateChange);
}, [isConnected]);
```

## Phase 4: Example App Integration

### Update Example App
```typescript
// examples/react-native-expo/App.tsx - NO CHANGES NEEDED! ✅
// The hook interface stays exactly the same

const App = () => {
  return (
    <ElevenLabsProvider>
      <ConversationScreen />
    </ElevenLabsProvider>
  );
};

const ConversationScreen = () => {
  const {
    startConversation,
    endConversation,
    status,
    isConnected,
    transcript,
    error
  } = useElevenLabsConversation();

  // Same interface - no changes needed!
};
```

## Phase 5: Testing & Validation

### Development Build Setup
```json
// app.json
{
  "expo": {
    "plugins": [
      ["@livekit/react-native-expo-plugin", {
        "android": {
          "enableAudioFocus": true,
          "enableAudioManager": true
        },
        "ios": {
          "enableBackgroundAudio": true
        }
      }]
    ]
  }
}
```

### Testing Checklist
- [ ] Connection to ElevenLabs agents
- [ ] Audio input/output working
- [ ] Client tools execution
- [ ] Connection quality reporting
- [ ] iOS/Android platform-specific features
- [ ] App backgrounding/foregrounding
- [ ] Error handling and recovery
- [ ] TypeScript types working

## Key Benefits of This Approach ✅

1. **No Breaking Changes**: Example app code doesn't change
2. **Incremental Integration**: Add LiveKit features step by step
3. **Platform Safety**: Avoid PlatformConstants errors by careful imports
4. **Type Safety**: Full TypeScript support maintained
5. **Testing**: Each phase can be tested independently
6. **Fallback**: Current implementation works without LiveKit

## Implementation Priority

1. **Phase 1** (Core): Basic LiveKit connection + audio
2. **Phase 2** (Features): Client tools + advanced controls
3. **Phase 3** (Platform): iOS/Android specific optimizations
4. **Phase 4** (Polish): Example app enhancements
5. **Phase 5** (Quality): Testing + documentation

This approach ensures we have a **working SDK today** with a **clear path to full LiveKit integration** without breaking changes! 🚀