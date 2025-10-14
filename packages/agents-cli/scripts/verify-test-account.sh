#!/bin/bash

# Script to verify you're using a safe test account before running E2E tests

set -e

echo "🔍 Verifying test account safety..."
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "❌ No .env file found"
    echo "   Run: cp .env.example .env"
    echo "   Then add your TEST account API key"
    exit 1
fi

# Check if API key is set
if ! grep -q "ELEVENLABS_API_KEY=.*[a-zA-Z0-9]" .env; then
    echo "❌ No API key found in .env"
    echo "   Add your TEST account API key to .env"
    exit 1
fi

echo "✓ .env file found with API key"
echo ""

# Show which account is being used
echo "📋 Current account:"
npm run dev -- whoami --no-ui 2>&1 | grep -E "(Logged in|API key|Residency)" || true
echo ""

# List agents
echo "📋 Existing agents in this account:"
AGENTS=$(npm run dev -- list --no-ui 2>&1)
echo "$AGENTS"
echo ""

# Count agents
AGENT_COUNT=$(echo "$AGENTS" | grep -c "^[0-9]\+\." || true)

if [ "$AGENT_COUNT" -gt 0 ]; then
    echo "⚠️  WARNING: This account has $AGENT_COUNT existing agent(s)"
    echo ""
    echo "   E2E tests will create, modify, and DELETE agents."
    echo "   Are you SURE this is your test account?"
    echo ""
    read -p "   Continue anyway? (type 'yes' to confirm): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "❌ Aborted. Please switch to an empty test account."
        exit 1
    fi
else
    echo "✅ Account is empty - safe to run E2E tests"
fi

echo ""
echo "✓ Safety check passed"
echo ""
echo "Run E2E tests with: npm run test:e2e"
