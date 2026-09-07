#!/bin/bash
# ~/agentic-studio/scripts/setup-env.sh
# Configures environment variables for Claude Code agent teams

set -e

echo "🔧 Setting up Agentic Studio environment..."

# Check if variables already exist in shell rc
SHELL_RC="${HOME}/.bashrc"
if [ -n "${ZSH_VERSION}" ]; then
    SHELL_RC="${HOME}/.zshrc"
fi

# Add environment variables if not present
if ! grep -q "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1" "${SHELL_RC}"; then
    echo "" >> "${SHELL_RC}"
    echo "# Agentic Studio - Claude Code Agent Teams" >> "${SHELL_RC}"
    echo "export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1" >> "${SHELL_RC}"
    echo "export CLAUDE_CODE_NO_FLICKER=1" >> "${SHELL_RC}"
    echo "✅ Added Claude Code env vars to ${SHELL_RC}"
else
    echo "ℹ️  Claude Code env vars already configured in ${SHELL_RC}"
fi

# Export for current session
export CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1
export CLAUDE_CODE_NO_FLICKER=1

echo ""
echo "🎉 Environment setup complete!"
echo ""
echo "Next steps:"
echo "1. Run: source ${SHELL_RC}"
echo "2. Run: claude auth login"
echo "3. Start your first project:"
echo "   cd ~/agentic-studio/projects"
echo "   mkdir my-first-project && cd my-first-project"
echo "   cp ../../templates/tasks.json ."
echo "   git init && git add -A && git commit -m 'chore: init project'"
echo "   claude"
