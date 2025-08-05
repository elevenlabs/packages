# ElevenLabs ConvAI CLI - Agents as Code

Manage ElevenLabs Conversational AI agents with local configuration files. This tool is an experimental exploration of treating agents as code, with features like templates, multi-environment support, and automatic syncing.

## Features

- **Agent Configuration**: Full ElevenLabs agent schema support
- **Templates**: Pre-built templates for common use cases  
- **Multi-environment**: Deploy across dev, staging, production
- **Smart Updates**: Hash-based change detection
- **Watch Mode**: Automatic sync on file changes
- **Import/Export**: Fetch existing agents from workspace
- **Widget Generation**: HTML widget snippets
- **Secure Storage**: OS keychain integration with secure file fallback

## Installation

```bash
# Global installation
pnpm install -g @elevenlabs/convai-cli
# OR
npm install -g @elevenlabs/convai-cli

# One-time usage
pnpm dlx @elevenlabs/convai-cli init
# OR  
npx @elevenlabs/convai-cli init
```

## Setup

### Authentication

Login with your ElevenLabs API key (stored securely across all platforms):
```bash
convai login
```

Or set environment variable:
```bash
export ELEVENLABS_API_KEY="your_api_key_here"
```

> **Note**: For now, your API key must be unrestricted to work with the CLI, as Conversational AI-restricted keys are not available yet. 

### Check Status
```bash
convai whoami
```

### Set Residency Location

Configure the API residency for isolated regions:
```bash
# Set to EU residency (uses api.eu.elevenlabs.io)
convai residency eu-residency

# Set to India residency (uses api.in.elevenlabs.io)
convai residency in-residency

# Set to US/Global (uses api.elevenlabs.io or api.us.elevenlabs.io)
convai residency global  # or 'us'
```

### Logout
```bash
convai logout
```

## Quick Start

```bash
# 1. Initialize project
convai init

# 2. Login with API key
convai login

# 3. Create agent with template
convai add "Support Bot" --template customer-service

# 4. Edit configuration (agent_configs/prod/support_bot.json)

# 5. Sync to ElevenLabs
convai sync

# 6. Watch for changes (optional)
convai watch
```

## Directory Structure

```
your_project/
├── agents.json              # Central configuration
├── agent_configs/           # Agent configs by environment
│   ├── prod/
│   ├── dev/
│   └── staging/
└── convai.lock              # Agent IDs and hashes
```

## Commands

### Core Commands
```bash
# Initialize project
convai init

# Authentication
convai login
convai logout
convai whoami

# Create agent
convai add "Agent Name" [--template customer-service] [--env dev]

# Sync changes
convai sync [--agent "Agent Name"] [--env production] [--dry-run]

# Check status
convai status [--agent "Agent Name"] [--env production]

# Watch for changes
convai watch [--agent "Agent Name"] [--env dev] [--interval 5]

# Import from ElevenLabs
convai fetch [--search "term"] [--env staging] [--dry-run]

# Generate widget HTML (includes server-location for isolated regions)
convai widget "Agent Name" [--env production]

# List agents
convai list-agents
```

### Templates
```bash
# List available templates
convai templates list

# Show template details
convai templates show customer-service
```

## Available Templates

### `default`
Complete configuration with all available fields and sensible defaults. Includes full voice and text support, widget customization, evaluation criteria, and platform settings. Best for production deployments requiring comprehensive configuration.

### `minimal` 
Minimal configuration with only essential fields. Contains basic agent prompt, language settings, TTS configuration, and conversation settings. Perfect for quick prototyping and simple use cases.

### `voice-only`
Optimized for voice-only conversations. Disables text input and focuses on voice interaction features. Includes advanced voice settings, turn management, and audio processing optimizations.

### `text-only`
Optimized for text-only conversations. Disables voice features and focuses on text-based interactions. 

### `customer-service`
Pre-configured for customer service scenarios. Features professional, empathetic prompts with consistent responses (low temperature). Includes extended conversation duration (30 minutes), evaluation criteria for service quality, and customer-service tags.

### `assistant`
General purpose AI assistant configuration. Balanced creativity settings with helpful, knowledgeable prompts. Supports both voice and text interactions for versatile use cases like Q&A, explanations, and analysis tasks.

## Configuration Example

```json
{
    "name": "Support Bot",
    "conversation_config": {
        "agent": {
            "prompt": {
                "prompt": "You are a helpful customer service representative.",
                "llm": "gemini-2.0-flash",
                "temperature": 0.1
            },
            "language": "en"
        },
        "tts": {
            "model_id": "eleven_turbo_v2",
            "voice_id": "cjVigY5qzO86Huf0OWal"
        }
    },
    "tags": ["customer-service"]
}
```

## Common Workflows

**New Project:**
```bash
convai init
convai login
convai add "My Agent" --template assistant
convai sync
```

**Multi-Environment:**
```bash
convai add "Bot" --env dev --template customer-service
convai add "Bot" --env prod --template customer-service
convai sync --env dev
convai sync --env prod
```

**Import Existing:**
```bash
convai init
convai login
convai fetch --env prod
convai sync
```

**Development:**
```bash
convai watch --env dev --interval 5
# Edit configs in another terminal - auto-syncs!
```

## Troubleshooting

**Authentication Issues:**
```bash
# Check login status
convai whoami

# Login again
convai login

# Or use environment variable
export ELEVENLABS_API_KEY="your_api_key_here"
```

**Agent Not Found:**
- Check: `convai list-agents`
- Verify: `convai status --env <environment>`

**Sync Issues:**
- Preview: `convai sync --dry-run`
- Check: `cat convai.lock`

**Reset Project:**
```bash
rm convai.lock
convai init
convai login
convai sync
```

## Development

```bash
# Install dependencies
pnpm install

# Build
pnpm run build

# Test
pnpm test

# Lint
pnpm run lint
```

## Security

The CLI stores your API key securely with multiple fallback options:
- **Environment Variable**: `ELEVENLABS_API_KEY` takes highest priority for CI/CD
- **OS Keychain**: Uses native credential store (keytar) when available
- **Secure File**: Falls back to `~/.convai/api_key` with restricted permissions (600)

Configuration files are stored in `~/.convai/` with secure directory permissions (700 on Unix-like systems).

## Support

- Use `convai --help` or `convai <command> --help`
- Check GitHub issues
- Create new issue with problem details
