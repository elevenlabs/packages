/**
 * ElevenLabs Conversational AI Agent Manager
 * TypeScript/Node.js implementation
 */

export * from './utils';
export * from './templates';
export * from './elevenlabs-api';

// Re-export main types
export type { LockFileData, LockFileAgent } from './utils';
export type { AgentConfig } from './templates';

// Version
export const version = '0.1.7'; 