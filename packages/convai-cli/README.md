# ElevenLabs Conversational AI Agent Manager CLI

A powerful CLI tool to manage ElevenLabs Conversational AI agents using local configuration files. Features hash-based change detection, templates, multi-environment support, and continuous syncing.

## Features

- **Complete Agent Configuration**: Full ElevenLabs agent schema support (ASR, TTS, platform settings, etc.)
- **Template System**: Pre-built templates for common use cases
- **Multi-environment Support**: Deploy across dev, staging, production with environment-specific configs
- **Hash-based Updates**: Only sync when configuration actually changes
- **Continuous Monitoring**: Watch mode for automatic updates
- **Agent Import**: Fetch existing agents from ElevenLabs workspace
- **Widget**: View HTML widget snippets for agents
- **TypeScript Support**: Built with TypeScript for type safety and better IDE support
- **Package Manager Support**: Easy installation via pnpm/npm

## Installation

### Via pnpm (Recommended)

```bash
# Global installation
pnpm install -g convai-cli

# Or use pnpm dlx for one-time usage
pnpm dlx convai-cli init
```

### Via npm (Alternative)

```bash
# Global installation
npm install -g convai-cli

# Or use npx for one-time usage
npx convai-cli init
```

### From Source

```bash
git clone https://github.com/angelogiacco/convai-npm
cd convai-npm
pnpm install
pnpm run build
pnpm link  # For global usage
```

## Configuration

Set your ElevenLabs API key:
```bash
export ELEVENLABS_API_KEY="your_api_key_here"
```

Or create a `.env` file in your project root:
```env
ELEVENLABS_API_KEY=your_api_key_here
```

## Programmatic Usage

The package also exports TypeScript/JavaScript functions for programmatic use:

```typescript
import { 
  calculateConfigHash, 
  readAgentConfig, 
  writeAgentConfig,
  getTemplateByName,
  getElevenLabsClient,
  createAgentApi 
} from 'convai-cli';

// Create an agent programmatically
const client = getElevenLabsClient();
const template = getTemplateByName('My Agent', 'customer-service');
const agentId = await createAgentApi(
  client, 
  'My Agent', 
  template.conversation_config,
  template.platform_settings,
  template.tags
);
```

## Quick Start

```bash
# 1. Initialize project
convai init

# 2. Create agent with template
convai add "Customer Support Bot" --template customer-service

# 3. Edit configuration
# Edit agent_configs/prod/customer_support_bot.json

# 4. Sync to ElevenLabs
convai sync

# 5. Watch for changes (optional)
convai watch
```

## Directory Structure

The tool uses a flexible directory structure in your project:

```
your_project_root/
├── agents.json              # Central agent configuration file
├── agent_configs/           # Agent configuration files
│   ├── prod/                # Production environment configs
│   │   ├── customer_support_bot.json
│   │   └── sales_assistant.json
│   ├── dev/                 # Development environment configs
│   │   └── test_bot.json
│   └── staging/             # Staging environment configs
├── convai.lock              # Lock file to store agent IDs and config hashes
└── pyproject.toml           # Project metadata and dependencies
```

## Central Agent Configuration (agents.json)

The `agents.json` file defines all your agents and their environment-specific configurations:

```json
{
    "agents": [
        {
            "name": "Customer Support Bot",
            "environments": {
                "prod": {
                    "config": "agent_configs/prod/customer_support_bot.json"
                },
                "dev": {
                    "config": "agent_configs/dev/customer_support_bot.json"
                }
            }
        }
    ]
}
```

## Quick Start

Here's how to get started in under 2 minutes:

```bash
# 1. Initialize your project
convai init

# 2. Add a new agent (creates config + uploads to ElevenLabs)
convai add "Customer Support Bot"

# 3. Edit the generated config file to customize your agent
# agent_configs/prod/customer_support_bot.json

# 4. Sync changes to ElevenLabs
convai sync

# 5. Watch for automatic updates (optional)
convai watch
```

That's it! Your agent is now live and will automatically update whenever you change the config.

## Usage

The main entry point for the CLI is `convai` (after installation). You can also run it via `poetry run convai` or `python -m elevenlabs_cli_tool.main`.

### 1. Initialize Project

Run this command in the root of your project where you want to manage agents.

```bash
convai init
```
This will create:
*   An `agents.json` file
*   A `convai.lock` file

### 2. Add a New Agent

Create a new agent - this will create the config file, upload to ElevenLabs, and save the ID:

```bash
convai add "Docs support agent"
```

This will:
*   Create a config file at `agent_configs/prod/docs_support_agent.json` with default settings
*   Upload the agent to ElevenLabs and get an ID
*   Add the agent to `agents.json` with the ID
*   Update the lock file

# Create for specific environment
convai add "Dev Bot" --env development

# Create config only (don't upload to ElevenLabs yet)
convai add "My Bot" --skip-upload

# Custom config path
convai add "Custom Bot" --config-path "custom/path/bot.json"
```

### 3. Templates

```bash
# List available templates
convai templates-list

# Show template configuration
convai template-show customer-service

# Create agent with template
convai add "Support Agent" --template customer-service
```

Available templates:
- **default**: Complete configuration with all fields
- **minimal**: Essential fields only
- **voice-only**: Voice conversation optimized
- **text-only**: Text conversation optimized
- **customer-service**: Customer support scenarios
- **assistant**: General AI assistant

### 4. Sync Changes

```bash
# Sync all agents in all environments
convai sync

# Sync specific agent
convai sync --agent "Support Bot"

# Sync specific environment
convai sync --env production

# Dry run to preview changes
convai sync --dry-run

# Sync specific agent in specific environment
convai sync --agent "Support Bot" --env production
```

### 5. Check Status

```bash
# Show status for all agents and environments
convai status

# Show status for specific agent
convai status --agent "Support Bot"

# Show status for specific environment
convai status --env production

# Show status for specific agent in specific environment
convai status --agent "Support Bot" --env production
```

### 6. Watch Mode

```bash
# Watch all agents in prod environment
convai watch

# Watch specific agent
convai watch --agent "Support Bot"

# Watch specific environment
convai watch --env development

# Custom check interval
convai watch --interval 10
```

### 7. Import Existing Agents

```bash
# Fetch all agents from ElevenLabs
convai fetch

# Fetch agents matching search term
convai fetch --search "support"

# Fetch to specific environment
convai fetch --env staging

# Dry run to see what would be imported
convai fetch --dry-run

# Custom output directory
convai fetch --output-dir "imported_configs"
```

### 8. View Widget Code

```bash
# View widget snippet for agent in prod environment
convai widget "Support Bot"

# Generate widget for specific environment
convai widget "Support Bot" --env development
```

### 9. List Agents

```bash
# List all configured agents
convai list-agents
```

## Agent Configuration

### Minimal Example
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

### New Project Setup
```bash
convai init
convai add "My Agent" --template assistant
# Edit agent_configs/prod/my_agent.json
convai sync
```

### Multi-Environment Development
```bash
# Create agents for different environments
convai add "Support Bot" --env development --template customer-service
convai add "Support Bot" --env production --template customer-service

# Edit configs for each environment
# agent_configs/development/support_bot.json - relaxed settings
# agent_configs/production/support_bot.json - production settings

# Sync environments separately
convai sync --env development
convai sync --env production

# Check status per environment
convai status --env development
convai status --env production
```

### Import and Sync Existing Agents
```bash
convai init
convai fetch --env production
convai status
# Edit configs as needed
convai sync
```

### Continuous Development Workflow
```bash
# Start watching for changes (runs in background)
convai watch --env development --interval 5

# In another terminal, edit your agent configs
# Changes will automatically sync to ElevenLabs!

# Check status anytime
convai status --env development
```

## Environment-Specific Configuration

### Lock File Structure
The `convai.lock` file stores agent IDs and configuration hashes per environment:

```json
{
    "agents": {
        "Support Bot": {
            "production": {
                "id": "agent-id-1",
                "hash": "config-hash-1"
            },
            "development": {
                "id": "agent-id-2", 
                "hash": "config-hash-2"
            }
        }
    }
}
```

### Environment Tags
When creating or updating agents, the CLI automatically adds environment tags to help organize your agents in the ElevenLabs dashboard.

## Widget Integration

Generate HTML widget code for your agents:

```bash
convai widget "Support Bot"
```

Output:
```html
<elevenlabs-convai agent-id="your-agent-id"></elevenlabs-convai>
<script src="https://unpkg.com/@elevenlabs/convai-widget-embed" async type="text/javascript"></script>
```

## Command Reference

| Command | Description | Options |
|---------|-------------|---------|
| `convai init [path]` | Initialize project | Optional path (default: current directory) |
| `convai add <name>` | Create new agent | `--template`, `--env`, `--skip-upload`, `--config-path` |
| `convai templates-list` | List available templates | None |
| `convai template-show <template>` | Show template config | `--agent-name` |
| `convai sync` | Synchronize agents | `--agent`, `--env`, `--dry-run` |
| `convai status` | Show agent status | `--agent`, `--env` |
| `convai watch` | Monitor and auto-sync | `--agent`, `--env`, `--interval` |
| `convai fetch` | Import agents from ElevenLabs | `--agent`, `--search`, `--env`, `--output-dir`, `--dry-run` |
| `convai list-agents` | List configured agents | None |
| `convai widget <name>` | Generate widget HTML | `--env` |

## Troubleshooting

### Common Issues

**API Key Not Found**
```bash
export ELEVENLABS_API_KEY="your_api_key_here"
# Or add to your .env file
echo "ELEVENLABS_API_KEY=your_api_key_here" >> .env
```

**Agent Not Found Error**
- Check if agent exists: `convai list-agents`
- Verify environment: `convai status --env <environment>`
- Check agents.json format

**Sync Issues**
- Verify config file exists and is valid JSON
- Check lock file: `cat convai.lock`
- Use dry-run to preview: `convai sync --dry-run`

**Template Not Found**
- List available templates: `convai templates-list`
- Check spelling of template name

**Config File Errors**
- Validate JSON syntax
- Check required fields (name, conversation_config)
- Refer to template examples: `convai template-show <template>`

### Debug Commands

```bash
# Check overall status
convai status

# Check specific environment
convai status --env development

# Preview sync changes
convai sync --dry-run

# Get help for any command
convai <command> --help
```

### Reset and Clean Start

```bash
# Remove lock file to reset agent IDs
rm convai.lock

# Re-initialize
convai init

# Re-sync all agents
convai sync
```

## Best Practices

1. **Environment Separation**: Use different environments for development, staging, and production
2. **Descriptive Names**: Use clear, descriptive names for agents
3. **Version Control**: Commit `agents.json` and config files, exclude `convai.lock`
4. **Template Usage**: Start with templates and customize as needed  
5. **Regular Syncing**: Use watch mode during development
6. **Testing**: Test agents in development before promoting to production

## Development

### Running Tests
```bash
pnpm test
```

### Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run linting and formatting: `pnpm run lint && pnpm run format`
6. Submit a pull request

### Project Structure
```
src/
├── cli.ts               # Main CLI application
├── utils.ts             # Utility functions
├── elevenlabs-api.ts    # ElevenLabs API client
├── templates.ts         # Agent templates
└── index.ts             # Main exports
```

### Development Commands
```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run in development mode
pnpm run dev

# Run linting
pnpm run lint

# Format code
pnpm run format

# Run tests
pnpm test
```

## Support

For issues, questions, or feature requests:
1. Check the troubleshooting section above
2. Use `convai --help` or `convai <command> --help`
3. Check existing GitHub issues
4. Create a new issue with details about your problem