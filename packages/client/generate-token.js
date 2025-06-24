#!/usr/bin/env node

/**
 * Generate LiveKit access token using ElevenLabs backend
 * 
 * Usage:
 *   node generate-token.js --agent-id=your-agent-id --xi-api-key=your-xi-api-key
 * 
 * Or set environment variables:
 *   XI_API_KEY=your-key node generate-token.js --agent-id=your-agent-id
 */

import process from 'process';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
  const arg = args.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : null;
};

const XI_API_KEY = getArg('xi-api-key') || process.env.XI_API_KEY;
const AGENT_ID = getArg('agent-id') || process.env.AGENT_ID;
const BACKEND_URL = "https://api.elevenlabs.io";
const SIGNED_URL = getArg('signed-url') || process.env.SIGNED_URL;
const PARTICIPANT_NAME = getArg('participant-name') || process.env.PARTICIPANT_NAME;

if (!XI_API_KEY) {
  console.error('Error: XI API Key is required');
  console.error('Usage: node generate-token.js --agent-id=your-agent-id --xi-api-key=your-xi-api-key');
  console.error('Or set XI_API_KEY environment variable');
  process.exit(1);
}

if (!AGENT_ID) {
  console.error('Error: Agent ID is required');
  console.error('Usage: node generate-token.js --agent-id=your-agent-id --xi-api-key=your-xi-api-key');
  console.error('Or set AGENT_ID environment variable');
  process.exit(1);
}

async function generateToken() {
  try {
    console.log('🔑 Requesting LiveKit token from ElevenLabs backend...');
    console.log(`Backend URL: ${BACKEND_URL}`);
    console.log(`Agent ID: ${AGENT_ID}`);
    
    // Build the query parameters
    const params = new URLSearchParams({
      agent_id: AGENT_ID,
    });
    
    if (PARTICIPANT_NAME) {
      params.append('participant_name', PARTICIPANT_NAME);
    }
    
    if (SIGNED_URL) {
      params.append('signed_url', SIGNED_URL);
    }
    
    const url = `${BACKEND_URL}/v1/convai/conversation/token?${params.toString()}`;
    console.log(`Request URL: ${url}`);
    
    const headers = {
      'xi-api-key': XI_API_KEY,
      'Content-Type': 'application/json',
    };
    
    console.log('📡 Making request to ElevenLabs backend...');
    const response = await fetch(url, {
      method: 'GET',
      headers: headers,
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    const token = data.token;
    
    if (!token) {
      throw new Error('No token received from backend');
    }
    
    console.log('\n✅ Token generated successfully!');
    console.log('\n📋 Use these values for testing:');
    console.log('─'.repeat(60));
    console.log(`Agent ID: ${AGENT_ID}`);
    console.log(`Backend URL: ${BACKEND_URL}`);
    console.log(`Access Token: ${token}`);
    if (SIGNED_URL) {
      console.log(`Signed URL: ${SIGNED_URL}`);
    }
    if (PARTICIPANT_NAME) {
      console.log(`Participant Name: ${PARTICIPANT_NAME}`);
    }
    console.log('─'.repeat(60));
    
    console.log('\n🧪 Test commands:');
    console.log(`node test-webrtc-node.js --agent-id="${AGENT_ID}" --token="${token}"`);
    console.log('\nOr set environment variables:');
    console.log(`export AGENT_ID="${AGENT_ID}"`);
    console.log(`export LIVEKIT_TOKEN="${token}"`);
    console.log('node test-webrtc-node.js');
    
  } catch (error) {
    console.error('❌ Error generating token:', error.message);
    if (error.cause) {
      console.error('Caused by:', error.cause);
    }
    process.exit(1);
  }
}

generateToken().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});