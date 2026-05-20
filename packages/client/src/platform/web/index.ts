// Side-effect: registers the web voice session setup strategy
import "./VoiceSessionSetup.js";

// Side-effect: registers the web audio adapter for WebRTC connections
import { setWebRTCAudioAdapterFactory } from "../../WebRTCAudioAdapter.js";
import { WebAudioAdapter } from "./webAudioAdapter.js";
setWebRTCAudioAdapterFactory(() => new WebAudioAdapter());

// Side-effect: registers the web Scribe microphone implementation
import { setScribeMicrophoneSetup } from "../../scribe/microphone.js";
import { webScribeMicrophoneSetup } from "./scribeMicrophone.js";
setScribeMicrophoneSetup(webScribeMicrophoneSetup);

export * from "../../index.js";
