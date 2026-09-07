#!/bin/bash
# ~/agentic-studio/scripts/on-task-complete.sh
# Run this after completing a task to trigger social content generation
# Usage: bash scripts/on-task-complete.sh <project-name> "<project description>" "<tech,stack>"

set -e

if [ $# -lt 1 ]; then
    echo "Usage: bash scripts/on-task-complete.sh <project-name> [description] [tech-stack]"
    exit 1
fi

PROJECT_NAME="$1"
PROJECT_DESC="${2:-A new project}"
TECH_STACK="${3:-Next.js, Tailwind, Node.js}"

echo "🎉 Task complete! Generating social content for $PROJECT_NAME..."
echo ""

bash ~/agentic-studio/business/content-generator.sh "$PROJECT_NAME" "$PROJECT_DESC" "$TECH_STACK"

echo ""
echo "📋 Next steps:"
echo "  1. Review drafts in ~/agentic-studio/business/queue/"
echo "  2. Pick the best lines, rewrite in your voice"
echo "  3. Post manually to LinkedIn / Twitter / Instagram"
echo "  4. Archive posted content: mv queue/* posted/"
