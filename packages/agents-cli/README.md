# ElevenLabs Agents CLI - Agents as Code

![hero](../../assets/hero.png)

# ElevenLabs Agents CLI

Build multimodal agents with the [ElevenLabs Agents platform](https://elevenlabs.io/docs/agents-platform/overview).

Manage ElevenLabs Agents with local configuration files. This tool is an experimental exploration of treating agents as code, with features like templates, watch mode, and automatic pushing.

## Features

- **Agent Configuration**: Full ElevenLabs agent schema support
- **Templates**: Pre-built templates for common use cases
- **Smart Updates**: Hash-based change detection
- **Watch Mode**: Automatic sync on file changes
- **Import/Export**: Fetch existing agents and tools from workspace
- **Tool Management**: Import and manage tools from ElevenLabs workspace
- **Widget Generation**: HTML widget snippets
- **Secure Storage**: OS keychain integration with secure file fallback

## Installation

```bash
# Global installation
pnpm install -g @elevenlabs/agents-cli
# OR
npm install -g @elevenlabs/agents-cli

# One-time usage
pnpm dlx @elevenlabs/agents-cli init
# OR
npx @elevenlabs/agents-cli init
```

## Setup

### Authentication

Login with your ElevenLabs API key (stored securely across all platforms):

```bash
agents login
```

Or set environment variable:

```bash
export ELEVENLABS_API_KEY="your_api_key_here"
```

> **Note**: For now, your API key must be unrestricted to work with the CLI, as ElevenLabs Agents-restricted keys are not available yet.

### Check Status

```bash
agents whoami
```

### Set Residency Location

Configure the API residency for isolated regions:

```bash
# Set to EU residency (uses api.eu.elevenlabs.io)
agents residency eu-residency

# Set to India residency (uses api.in.elevenlabs.io)
agents residency in-residency

# Set to US/Global (uses api.elevenlabs.io or api.us.elevenlabs.io)
agents residency global  # or 'us'
```

### Logout

```bash
agents logout
```

## Quick Start

```bash
# 1. Initialize project
agents init

# Or override existing configuration
agents init --override

# 2. Login with API key
agents login

# 3. Create agent with template
agents add "Support Bot" --template customer-service

# 4. Edit configuration (agent_configs/support_bot.json)

# 5. Sync to ElevenLabs
agents push

# 6. Watch for changes (optional)
agents watch
```

## Directory Structure

```
your_project/
├── agents.json              # Central configuration
├── tools.json               # Tool configurations
├── agent_configs/           # Agent configuration files
├── tool_configs/            # Tool configurations
├── agents.lock              # Agent IDs and hashes
└── tools-lock.json          # Tool IDs and hashes
```

## Commands

### Initialize Project

The `agents init` command sets up the project structure for managing ElevenLabs agents:

```bash
agents init                    # Initialize in current directory
agents init ./my-project       # Initialize in specific directory
agents init --override         # Override existing files and recreate from scratch
```

**Default behavior**: When you run `agents init`, it will:
- Create missing files and directories
- Skip existing files (shown as "skipped" in output)
- Preserve your existing configuration

**Override mode** (`--override`): When you need to reset your project:
- Overwrites all configuration files
- Recreates directory structure from scratch
- ⚠️ **Warning**: This will delete all existing configurations in `agent_configs/`, `tool_configs/`, and `test_configs/`

Use `--override` when:
- You want to start fresh with a clean configuration
- Your configuration has become inconsistent
- You're setting up a new environment and want to ensure clean state

### Core Commands

```bash

# Authentication
agents login
agents logout
agents whoami

# Create agent
agents add "Agent Name" [--template customer-service]

# Create webhook tool
agents add-webhook-tool "Tool Name" [--config-path path]

# Create client tool
agents add-client-tool "Tool Name" [--config-path path]

# Push changes
agents push [--agent "Agent Name"] [--dry-run]

# Sync tools
agents push-tools [--tool "Tool Name"] [--dry-run]

# Sync tests
agents push-tests [--dry-run]

# Check status
agents status [--agent "Agent Name"]

# Watch for changes
agents watch [--agent "Agent Name"] [--interval 5]

# Pull agents from ElevenLabs
agents pull [--search "term"] [--dry-run]

# Pull tools from ElevenLabs
agents pull-tools [--search "term"] [--tool "tool-name"] [--dry-run] [--output-dir tool_configs]

# Import tests from ElevenLabs
agents pull-tests [--output-dir test_configs] [--dry-run]

# Run tests
agents test "Agent Name"

# Generate widget HTML (includes server-location for isolated regions)
agents widget "Agent Name"

# List agents
agents list

# Delete agent (removes locally and from ElevenLabs)
agents delete <agent_id>

# Add componenents from [ui.elevenlabs.io](https://ui.elevenlabs.io)
agents components add "Component Name"
```

### Templates

```bash
# List available templates
agents templates list

# Show template details
agents templates show customer-service
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
agents init
agents login
agents add "My Agent" --template assistant
agents push
```

**Import Existing:**

```bash
agents init
agents login
agents pull
agents push
```

**Import and Use Tools:**

```bash
agents init
agents login
agents pull-tools
# Edit tool configs in tool_configs/
# Reference tools in your agent configurations
agents push
```

**Development:**

```bash
agents watch --interval 5
# Edit configs in another terminal - auto-pushes!
```

**Delete Agent:**

```bash
# List agents to find the agent ID
agents list

# Delete agent by ID (removes locally and from ElevenLabs)
agents delete agent_123456789
```

## Troubleshooting

**Authentication Issues:**

```bash
# Check login status
agents whoami

# Login again
agents login

# Or use environment variable
export ELEVENLABS_API_KEY="your_api_key_here"
```

**Agent Not Found:**

- Check: `agents list`
- Verify: `agents status`

**Push Issues:**

- Preview: `agents push --dry-run`
- Check: `cat agents.lock`

**Reset Project:**

```bash
rm agents.lock
agents init
agents login
agents push
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
- **Secure File**: Falls back to `~/.agents/api_key` with restricted permissions (600)

Configuration files are stored in `~/.agents/` with secure directory permissions (700 on Unix-like systems).

## Support

- Use `agents --help` or `agents <command> --help`
- Check GitHub issues
- Create new issue with problem details
