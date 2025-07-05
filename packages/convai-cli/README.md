# ElevenLabs ConvAI CLI

Manage ElevenLabs Conversational AI agents with local configuration files. Features templates, multi-environment support, and automatic syncing.

## Features

- **Agent Configuration**: Full ElevenLabs agent schema support
- **Templates**: Pre-built templates for common use cases  
- **Multi-environment**: Deploy across dev, staging, production
- **Smart Updates**: Hash-based change detection
- **Watch Mode**: Automatic sync on file changes
- **Import/Export**: Fetch existing agents from workspace
- **Widget Generation**: HTML widget snippets

## Installation

```bash
# Global installation
pnpm install -g convai-cli
# OR
npm install -g convai-cli

# One-time usage
pnpm dlx convai-cli init
# OR  
npx convai-cli init
```

## Setup

Set your ElevenLabs API key:
```bash
export ELEVENLABS_API_KEY="your_api_key_here"
```

Or create a `.env` file:
```env
ELEVENLABS_API_KEY=your_api_key_here
```

## Quick Start

```bash
# 1. Initialize project
convai init

# 2. Create agent with template
convai add "Support Bot" --template customer-service

# 3. Edit configuration (agent_configs/prod/support_bot.json)

# 4. Sync to ElevenLabs
convai sync

# 5. Watch for changes (optional)
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

# Generate widget HTML
convai widget "Agent Name" [--env production]

# List agents
convai list-agents
```

### Templates
```bash
# List available templates
convai templates-list

# Show template details
convai template-show customer-service
```

Available templates: `default`, `minimal`, `voice-only`, `text-only`, `customer-service`, `assistant`

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
convai fetch --env prod
convai sync
```

**Development:**
```bash
convai watch --env dev --interval 5
# Edit configs in another terminal - auto-syncs!
```

## Troubleshooting

**API Key Issues:**
```bash
export ELEVENLABS_API_KEY="your_api_key_here"
# Or add to .env file
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

## Support

- Use `convai --help` or `convai <command> --help`
- Check GitHub issues
- Create new issue with problem details