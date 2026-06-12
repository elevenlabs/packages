// Side-effect: registers the web voice session setup strategy
import "./VoiceSessionSetup.js";

// Side-effect: arms iOS audio unlock on first user gesture (no-op on other
// platforms). Needed because the convai widget awaits other promises (terms
// modal etc.) between the user's tap and Conversation.startSession, by which
// point the gesture has been consumed.
import { installIosAudioUnlockListener } from "./audioUnlock.js";
installIosAudioUnlockListener();

// Side-effect: registers the web audio adapter for WebRTC connections
import { setWebRTCAudioAdapterFactory } from "../../WebRTCAudioAdapter.js";
import { WebAudioAdapter } from "./webAudioAdapter.js";
setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());

// Side-effect: registers the web Scribe microphone implementation
import { setScribeMicrophoneSetup } from "../../scribe/microphone.js";
import { webScribeMicrophoneSetup } from "./scribeMicrophone.js";
setScribeMicrophoneSetup(webScribeMicrophoneSetup);

export * from "../../index.js";
