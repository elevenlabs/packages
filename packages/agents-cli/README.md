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

### Multi-Environment Management

The CLI supports managing agents, tools, and tests across multiple isolated environments (e.g., dev, staging, prod).

#### Login to Multiple Environments

```bash
# Login to production
agents login --env prod

# Login to staging
agents login --env staging

# Login to development
agents login --env dev
```

Each environment stores its API key securely and independently.

#### Check All Environments

```bash
agents whoami
# Shows all configured environments and their authentication status
```

#### Logout from Specific Environment

```bash
agents logout --env dev
```

#### Environment Field in Configurations

Agent, tool, and test definitions include an `env` field:

```json
{
  "agents": [
    {
      "config": "agent_configs/support_bot.json",
      "id": "agent_123",
      "env": "prod"
    },
    {
      "config": "agent_configs/support_bot_dev.json", 
      "id": "agent_456",
      "env": "dev"
    }
  ]
}
```

When `env` is not specified, it defaults to `prod`.

## Quick Start

```bash
# 1. Initialize project
agents init

# Or override existing configuration
agents init --override

# 2. Login with API key (defaults to 'prod' environment)
agents login

# 3. Create agent with template
agents add "Support Bot" --template customer-service

# 4. Edit configuration (agent_configs/support_bot.json)

# 5. Sync to ElevenLabs
agents push

# 6. Watch for changes (optional)
agents watch
```

> **Note**: This example uses the default 'prod' environment. For multi-environment workflows, see [Multi-Environment Management](#multi-environment-management) and [Multi-Environment Workflows](#multi-environment-workflows).

## Directory Structure

```
your_project/
├── agents.json              # Central configuration with env field per agent
├── tools.json               # Tool configurations with env field per tool
├── tests.json               # Test configurations with env field per test
├── agent_configs/           # Agent configuration files
├── tool_configs/            # Tool configurations
└── test_configs/            # Test configurations
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
agents add "Agent Name" [--template customer-service] [--env prod]

# Create webhook tool
agents add-webhook-tool "Tool Name" [--config-path path] [--env prod]

# Create client tool
agents add-client-tool "Tool Name" [--config-path path] [--env prod]

# Push changes (operates on all environments by default)
agents push [--agent "Agent Name"] [--env prod] [--dry-run]

# Sync tools (operates on all environments by default)
agents push-tools [--tool "Tool Name"] [--env prod] [--dry-run]

# Sync tests (operates on all environments by default)
agents push-tests [--env prod] [--dry-run]

# Check status
agents status [--agent "Agent Name"]

# Watch for changes
agents watch [--agent "Agent Name"] [--interval 5]

# Pull agents from ElevenLabs (pulls from all environments by default)
agents pull [--search "term"] [--env prod] [--dry-run]

# Pull tools from ElevenLabs (pulls from all environments by default)
agents pull-tools [--search "term"] [--tool "tool-name"] [--env prod] [--dry-run] [--output-dir tool_configs]

# Import tests from ElevenLabs (pulls from all environments by default)
agents pull-tests [--output-dir test_configs] [--env prod] [--dry-run]

# Create and run test
agents add-test "Test Name" [--template basic-llm] [--env prod]

# Run tests
agents test "Agent Name"

# Generate widget HTML (includes server-location for isolated regions)
agents widget "Agent Name"

# List agents
agents list

# Delete agent (removes locally and from ElevenLabs)
agents delete <agent_id>

# Delete tool locally and from ElevenLabs
agents delete-tool <tool_id>

# Delete all tools
agents delete-tool --all

# Delete all tools in specific environment
agents delete-tool --all --env prod

# Delete test locally and from ElevenLabs
agents delete-test <test_id>

# Delete all tests
agents delete-test --all

# Delete all tests in specific environment
agents delete-test --all --env dev

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
# Tools will have 'env' field - modify if needed
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

> **Tip**: When `--env` is not specified, most commands operate across all configured environments.

## Multi-Environment Workflows

**Setup Multiple Environments:**

```bash
# Initialise project
agents init

# Login to all environments
agents login --env dev
agents login --env staging
agents login --env prod

# Verify all environments
agents whoami
```

**Develop and Promote Agents:**

```bash
# Create agent in dev environment
agents add "My Agent" --template assistant --env dev

# Edit and test in dev
# Edit agent_configs/my_agent.json
agents push --env dev

# Pull to promote to staging
agents pull --env dev
# Update env field in agents.json from "dev" to "staging"
agents push --env staging

# Promote to production
# Update env field to "prod"
agents push --env prod
```

**Environment-Specific Operations:**

```bash
# Push only dev agents
agents push --env dev

# Pull only prod agents
agents pull --env prod

# Delete all dev tools
agents delete-tool --all --env dev

# Pull tests from staging
agents pull-tests --env staging
```

**Cross-Environment Management:**

```bash
# List all agents across all environments
agents list

# Push all agents to their respective environments
agents push

# Pull agents from all configured environments
agents pull
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
- Check: `agents status`

**Reset Project:**

```bash
agents init --override
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

## Testing

### Unit Tests
```bash
npm test
```

### E2E Tests

**CRITICAL**: E2E tests require a **dedicated, empty test account**. 

**DO NOT use your production account!** E2E tests will create, modify, and **delete agents** during testing. Any existing agents could be permanently lost.

**Setup:**

1. Create a new ElevenLabs account (separate from production)
2. Verify the account is completely empty (no deployed agents)
3. Generate an API key for this test account
4. Copy `.env.example` to `.env` and add the test account API key
5. Run: `npm run test:e2e`

**Quick safety check before running tests:**
```bash
npm run dev -- whoami --no-ui  # Verify you're using test account
npm run dev -- list --no-ui     # Should be empty or only test agents
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
