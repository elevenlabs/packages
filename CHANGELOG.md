# Changelog

All notable changes to the ElevenLabs JavaScript SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation overhaul with improved examples
- Architecture diagrams and connection type explanations
- Contributing guidelines (CONTRIBUTING.md)
- Better TypeScript type exports

### Fixed
- Corrected React hook documentation for mute control
- Fixed volume control method signature in examples
- Updated authentication flow examples for clarity

## [@elevenlabs/client@0.2.1] - 2024-01-XX

### Added
- WebRTC connection support for ultra-low latency conversations
- Connection factory pattern for automatic connection type selection
- LiveKit integration for WebRTC functionality
- Conversation token authentication for WebRTC connections

### Changed
- Improved error messages for authentication failures
- Better handling of connection state transitions

### Fixed
- Android audio initialization delay issue
- WebRTC audio track management

## [@elevenlabs/react@0.2.1] - 2024-01-XX

### Added
- Full WebRTC support in React hooks
- Controlled state management for volume and mute
- `isSpeaking` state for UI feedback

### Changed
- Improved TypeScript types for better IDE support
- Better cleanup on component unmount

### Fixed
- State synchronization issues
- Memory leaks in event listeners

## [@elevenlabs/client@0.2.0] - 2023-12-XX

### Added
- Text-only conversation mode
- iOS headphone preference option
- Wake lock support to prevent device sleep
- Connection delay configuration per platform

### Changed
- Improved WebSocket reconnection logic
- Better error handling and recovery

## [@elevenlabs/react@0.2.0] - 2023-12-XX

### Added
- `useConversation` hook for React applications
- Client tools support
- Conversation overrides
- Real-time status and mode tracking

### Changed
- Simplified API surface
- Better integration with React lifecycle

## [@elevenlabs/client@0.1.0] - 2023-11-XX

### Added
- Initial release
- WebSocket-based conversations
- Basic authentication (signed URLs)
- Client tools support
- Voice activity detection
- Feedback system

## [@elevenlabs/react@0.1.0] - 2023-11-XX

### Added
- Initial release
- Basic React integration
- Hook-based API