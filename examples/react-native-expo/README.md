# ElevenLabs React Native Example

A minimal React Native Expo app demonstrating the ElevenLabs React Native SDK for voice conversations.

## Prerequisites

- Node.js 20+
- Expo CLI (`npm install -g @expo/cli`)
- iOS Simulator (for iOS testing) or Xcode for device testing
- Android Studio or Android device (for Android testing)

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install iOS CocoaPods (iOS only):
   ```bash
   cd ios && pod install && cd ..
   ```

## Running the App

⚠️ **Important**: This app requires a development build and cannot run in Expo Go due to WebRTC native dependencies.

### iOS
```bash
npm run ios
```

### Android
```bash
npm run android
```

### Development Build
```bash
npm start
```

## Current Status

- ✅ **Milestone 1**: Basic app structure and boilerplate
- ✅ **Milestone 2**: SDK integration with React hook-based API
- ⏳ **Milestone 3**: Real agent conversation testing
- ⏳ **Milestone 4**: Advanced features and polish

## Testing Milestone 2

The app should:
1. Start without crashes
2. Show "ElevenLabs React Native" title with hook-based UI
3. Display conversation status with visual indicator
4. Provide "Start Conversation" and "End Conversation" buttons
5. Handle conversation lifecycle through React hooks
6. Show conversation ID when connected

## Usage

This example demonstrates the hook-based API of the ElevenLabs React Native SDK:

```typescript
import React from 'react';
import { useConversation } from '@elevenlabs/react-native';

function MyComponent() {
  const conversation = useConversation({
    agentId: 'your-agent-id',
    onConnect: ({ conversationId }) => console.log('Connected:', conversationId),
    onMessage: ({ message, source }) => console.log(`${source}:`, message),
    onError: (error) => console.error('Error:', error),
  });

  const { status, startSession, endSession } = conversation;

  return (
    <View>
      <Text>Status: {status}</Text>
      <Button onPress={() => startSession()} title="Start" />
      <Button onPress={() => endSession()} title="End" />
    </View>
  );
}
```

## Troubleshooting

- Make sure you're using development builds, not Expo Go
- Ensure all dependencies are installed with `npm install`
- For iOS, run `cd ios && pod install` if needed
- Check that your development environment is set up correctly for React Native