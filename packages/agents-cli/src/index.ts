/**
 * ElevenLabs Agents Manager
 * TypeScript/Node.js implementation
 */

export * from './utils.js';
export * from './templates.js';
export * from './elevenlabs-api.js';
export * from './config.js';

// Re-export main types
export type { AgentConfig } from './templates.js';
export type { CliConfig } from './config.js';

// Version
export { version } from '../package.json'; 