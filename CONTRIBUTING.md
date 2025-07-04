# Contributing to ElevenLabs JavaScript SDK

Thank you for your interest in contributing to the ElevenLabs JavaScript SDK! We welcome contributions from the community and are grateful for any help you can provide.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Guidelines](#coding-guidelines)
- [Testing](#testing)
- [Documentation](#documentation)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- Be respectful and inclusive
- Welcome newcomers and help them get started
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/elevenlabs-js.git
   cd elevenlabs-js
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/elevenlabs/elevenlabs-js.git
   ```

## Development Setup

### Prerequisites

- Node.js 18+ 
- pnpm 8+
- Git

### Installation

1. Install pnpm globally:
   ```bash
   npm install -g pnpm
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build all packages:
   ```bash
   pnpm build
   ```

### Development Workflow

To work on a specific package:

```bash
# Navigate to the package
cd packages/client

# Start development mode
pnpm dev

# Run tests
pnpm test

# Run linting
pnpm lint
```

### Linking Packages Locally

To test your changes in another project:

```bash
# In the package directory
pnpm link --global

# In your test project
pnpm link --global @elevenlabs/client
```

## Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-connection-type`
- `fix/websocket-reconnection-issue`
- `docs/update-react-examples`
- `chore/update-dependencies`

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
type(scope): subject

body

footer
```

Examples:
- `feat(client): add WebRTC connection support`
- `fix(react): correct volume control behavior`
- `docs: update authentication examples`
- `test(client): add connection retry tests`

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

## Submitting a Pull Request

1. **Update your fork**:
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes** and commit them with descriptive messages

4. **Add tests** for your changes

5. **Update documentation** if needed

6. **Run tests and linting**:
   ```bash
   pnpm test
   pnpm lint
   ```

7. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

8. **Create a Pull Request** on GitHub

### Pull Request Guidelines

- Fill out the PR template completely
- Link any related issues
- Include screenshots/recordings for UI changes
- Ensure all tests pass
- Keep PRs focused - one feature/fix per PR
- Be responsive to feedback

## Coding Guidelines

### TypeScript

- Use TypeScript for all new code
- Maintain strict type safety
- Avoid `any` types
- Export types separately from implementations
- Document complex types

### Code Style

We use Prettier for formatting. Run before committing:

```bash
pnpm prettier --write "packages/*/src/**/*.{ts,tsx}"
```

### Best Practices

- Write self-documenting code
- Keep functions small and focused
- Use meaningful variable names
- Add JSDoc comments for public APIs
- Handle errors gracefully
- Consider performance implications

Example:

```typescript
/**
 * Establishes a WebRTC connection with the specified agent.
 * @param agentId - The unique identifier of the agent
 * @param options - Optional configuration for the connection
 * @returns Promise resolving to the conversation instance
 * @throws {ConnectionError} If connection cannot be established
 */
export async function connectWebRTC(
  agentId: string,
  options?: WebRTCOptions
): Promise<Conversation> {
  // Implementation
}
```

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run tests for a specific package
cd packages/client && pnpm test

# Run tests in watch mode
pnpm test -- --watch

# Run tests with coverage
pnpm test -- --coverage
```

### Writing Tests

- Write tests for all new features
- Maintain existing test coverage
- Use descriptive test names
- Test edge cases
- Mock external dependencies

Example:

```typescript
describe('WebRTCConnection', () => {
  it('should establish connection with valid token', async () => {
    const connection = await WebRTCConnection.create({
      conversationToken: 'valid-token',
      agentId: 'test-agent'
    });
    
    expect(connection).toBeDefined();
    expect(connection.conversationId).toBeTruthy();
  });

  it('should throw error with invalid token', async () => {
    await expect(
      WebRTCConnection.create({
        conversationToken: 'invalid-token',
        agentId: 'test-agent'
      })
    ).rejects.toThrow('Invalid conversation token');
  });
});
```

## Documentation

### Code Documentation

- Add JSDoc comments to all public APIs
- Include parameter descriptions
- Document return values and exceptions
- Add usage examples for complex features

### README Updates

When adding new features:
1. Update the relevant package README
2. Add examples showing usage
3. Update the API reference section
4. Ensure examples are tested and working

### Example Documentation

```markdown
### Using Client Tools

Client tools allow your agent to interact with your application:

\```javascript
const conversation = await Conversation.startSession({
  agentId: 'agent-id',
  clientTools: {
    updateDatabase: async ({ id, data }) => {
      await database.update(id, data);
      return { success: true };
    }
  }
});
\```
```

## Reporting Issues

### Before Creating an Issue

1. Search existing issues to avoid duplicates
2. Check if the issue is already fixed in the latest version
3. Try to reproduce the issue with minimal code

### Creating an Issue

Include:
- Clear, descriptive title
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, browser, Node version)
- Code examples or repository demonstrating the issue
- Error messages and stack traces

### Issue Template

```markdown
## Description
Brief description of the issue

## Steps to Reproduce
1. Initialize conversation with...
2. Call method...
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: macOS 13.0
- Browser: Chrome 120
- Node: 18.17.0
- Package version: 0.2.1

## Code Example
\```javascript
// Minimal code to reproduce
\```

## Error Messages
\```
Full error stack trace
\```
```

## Questions?

If you have questions about contributing:

1. Check existing documentation
2. Ask in our [Discord community](https://discord.gg/elevenlabs)
3. Open a discussion on GitHub

Thank you for contributing to ElevenLabs JavaScript SDK! 🎉