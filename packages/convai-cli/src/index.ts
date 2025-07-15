/**
 * ElevenLabs Conversational AI Agent Manager
 * TypeScript/Node.js implementation
 */

export * from './utils';
export * from './templates';
export * from './elevenlabs-api';
export * from './config';

// Re-export main types
export type { LockFileData, LockFileAgent } from './utils';
export type { AgentConfig } from './templates';
export type { CliConfig } from './config';

// Version
export { version } from '../package.json'; 