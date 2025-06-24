#!/usr/bin/env node

/**
 * Node.js test script for WebRTC LiveKit connection
 * 
 * Usage:
 *   node test-webrtc-node.js --agent-id=your-agent-id --token=your-livekit-token
 * 
 * Or set environment variables:
 *   AGENT_ID=your-agent-id LIVEKIT_TOKEN=your-token node test-webrtc-node.js
 */

import { Conversation } from './dist/lib.modern.js';
import process from 'process';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};

const AGENT_ID = getArg('agent-id') || process.env.AGENT_ID;
const LIVEKIT_TOKEN = getArg('token') || process.env.LIVEKIT_TOKEN;
const CUSTOM_PROMPT = getArg('prompt') || process.env.CUSTOM_PROMPT;
const VOICE_ID = getArg('voice-id') || process.env.VOICE_ID;

if (!AGENT_ID) {
  console.error('Error: Agent ID is required');
  console.error('Usage: node test-webrtc-node.js --agent-id=your-agent-id --token=your-livekit-token');
  console.error('Or set AGENT_ID environment variable');
  process.exit(1);
}

if (!LIVEKIT_TOKEN) {
  console.error('Error: LiveKit token is required');
  console.error('Usage: node test-webrtc-node.js --agent-id=your-agent-id --token=your-livekit-token');
  console.error('Or set LIVEKIT_TOKEN environment variable');
  process.exit(1);
}

console.log('🚀 Starting WebRTC LiveKit test...');
console.log(`Agent ID: ${AGENT_ID}`);
console.log(`Token: ${LIVEKIT_TOKEN.substring(0, 20)}...`);

let conversation = null;

async function startTest() {
  try {
    const config = {
      conversationToken: LIVEKIT_TOKEN,
      connectionType: 'webrtc',
      onConnect: (event) => {
        console.log(`✅ Connected! Conversation ID: ${event.conversationId}`);
      },
      onDisconnect: (event) => {
        console.log(`❌ Disconnected: ${event.reason}${event.message ? ' - ' + event.message : ''}`);
        process.exit(0);
      },
      onMessage: (event) => {
        console.log(`💬 Message from ${event.source}: ${event.message}`);
      },
      onStatusChange: (event) => {
        console.log(`📊 Status: ${event.status}`);
      },
      onModeChange: (event) => {
        console.log(`🎤 Mode: ${event.mode}`);
      },
      onError: (error) => {
        console.error(`❌ Error: ${error.message}`);
      }
    };

    // Add overrides if provided
    if (CUSTOM_PROMPT || VOICE_ID) {
      config.overrides = {};
      
      if (CUSTOM_PROMPT) {
        config.overrides.agent = {
          prompt: { prompt: CUSTOM_PROMPT }
        };
        console.log(`🎯 Using custom prompt: ${CUSTOM_PROMPT}`);
      }
      
      if (VOICE_ID) {
        config.overrides.tts = {
          voiceId: VOICE_ID
        };
        console.log(`🎵 Using voice ID: ${VOICE_ID}`);
      }
    }

    console.log('🔗 Creating WebRTC connection...');
    conversation = await Conversation.startSession(config);
    console.log('🎉 Conversation started successfully!');
    console.log('🎤 Microphone should be active now. Speak to test the connection.');
    console.log('Press Ctrl+C to end the conversation.');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down...');
      if (conversation) {
        try {
          await conversation.endSession();
          console.log('✅ Conversation ended gracefully');
        } catch (error) {
          console.error('❌ Error ending conversation:', error.message);
        }
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start conversation:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

startTest().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});