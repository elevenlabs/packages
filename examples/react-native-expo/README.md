# ElevenLabs React Native Example

A minimal React Native Expo app demonstrating the ElevenLabs React Native SDK for voice conversations.

## Prerequisites

- Node.js 20+
- Physical iOS or Android device for testing

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

**Important**: This app requires a development build and cannot run in Expo Go due to WebRTC native dependencies.

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

## Simulators

Due to the app requiring microphone access, it will not function correctly in app simulators, either iOS or Android. Instead run the example app on a physical device to have a full conversation with your agent.

## Troubleshooting

- Make sure you're using development builds, not Expo Go
- Ensure all dependencies are installed with `npm install`
- For iOS, run `cd ios && pod install` if needed
- Check that your development environment is set up correctly for React Native
- Use a physical device rather than simulators