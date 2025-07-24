# ElevenLabs React Native Example

A minimal React Native Expo app demonstrating the ElevenLabs React Native SDK for voice conversations.

## Prerequisites

- Node.js 20+
- Physical iOS or Android device for testing

## Setup

```bash
# Create a .env file in the root of the project
cp .env.example .env
```

Follow the ElevenLabs Conversational AI [quickstart guide](https://elevenlabs.io/docs/conversational-ai/quickstart) to create an agent and set your agent ID in the `.env` file.

### Security consideration

This example uses a public agent ID for demonstration purposes. In a production app, you should generate a short lived signed URL in a secure server-side environment, see our [docs](https://elevenlabs.io/docs/conversational-ai/customization/authentication).

## Installation

Install dependencies:

```bash
npm install
```

## Development Build

Prebuild, required for native dependencies:

```bash
npx expo prebuild
```

## Running the App

**Important**: This app requires a development build and cannot run in Expo Go due to WebRTC native dependencies.

### Start the Expo server in tunnel mode

```bash
npx expo start --tunnel
```

### iOS

```bash
## Build your native iOS project (this will install CocoaPods)
npx expo run:ios --device
```

### Android

```bash
## Build your native Android project
npx expo run:android
```

## Simulators

Due to the app requiring microphone access, it will not function correctly in app simulators, either iOS or Android. Instead run the example app on a physical device to have a full conversation with your agent.

## Troubleshooting

- Make sure you're using development builds, not Expo Go
- Ensure all dependencies are installed with `npm install`
- For iOS, run `cd ios && pod install` if needed
- Check that your development environment is set up correctly for React Native
- Use a physical device rather than simulators
