import { registerGlobals } from "@livekit/react-native";

// Polyfill WebRTC globals needed by livekit-client in React Native
registerGlobals();

export * from "../../index";
