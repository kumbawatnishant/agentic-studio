#!/bin/bash
# ~/agentic-studio/scripts/daily-loop.sh
# Ralph Loop orchestrator for Kilo Code / Blackbox / Gemini CLI stack

PROJECT_DIR="$1"
cd "$PROJECT_DIR" || exit 1

echo "🚀 Starting Ralph Loop for $(basename $PROJECT_DIR)"

# Step 1: Pick next task (respects dependencies)
TASK=$(jq -r '.backlog[] | select(.status == "todo" and (.depends_on | length == 0 or all(.depends_on[] as $d | .backlog[] | select(.id == $d) | .status == "done"))) | .id' tasks.json | head -1)

if [ -z "$TASK" ]; then
    echo "✅ All tasks complete!"
    exit 0
fi

echo "📋 Selected task: $TASK"

# Get task details
TASK_TITLE=$(jq -r ".backlog[] | select(.id == \"$TASK\") | .title" tasks.json)
TASK_AGENT=$(jq -r ".backlog[] | select(.id == \"$TASK\") | .agent" tasks.json)
ACCEPTANCE=$(jq -r ".backlog[] | select(.id == \"$TASK\") | .acceptance | join(\", \")" tasks.json)

echo "   Title: $TASK_TITLE"
echo "   Agent: $TASK_AGENT"
echo "   Acceptance: $ACCEPTANCE"
echo ""

# Step 2: Launch appropriate agent tool
echo "🤖 Spawning agent..."
echo ""
echo "   ┌─────────────────────────────────────────────────────────────┐"
echo "   │  IN VS CODE / KILO CODE:                                    │"
echo "   │                                                             │"
if [ "$TASK_AGENT" = "architect" ]; then
    echo "   │  1. Open Kilo Code panel                                    │"
    echo "   │  2. Switch to: Architect mode                               │"
    echo "   │  3. Prompt: \"Work on task $TASK: $TASK_TITLE\"              │"
    echo "   │  4. Acceptance: $ACCEPTANCE                                 │"
elif [ "$TASK_AGENT" = "developer" ]; then
    echo "   │  1. Open Kilo Code panel                                    │"
    echo "   │  2. Switch to: Code mode                                    │"
    echo "   │  3. Prompt: \"Work on task $TASK: $TASK_TITLE\"              │"
    echo "   │  4. Acceptance: $ACCEPTANCE                                 │"
elif [ "$TASK_AGENT" = "designer" ]; then
    echo "   │  1. Open Kilo Code panel                                    │"
    echo "   │  2. Switch to: Code mode                                    │"
    echo "   │  3. Prompt: \"Work on task $TASK: $TASK_TITLE\"              │"
    echo "   │  4. Acceptance: $ACCEPTANCE                                 │"
elif [ "$TASK_AGENT" = "tester" ]; then
    echo "   │  1. Open Kilo Code panel                                    │"
    echo "   │  2. Switch to: Debug mode                                   │"
    echo "   │  3. Prompt: \"Work on task $TASK: $TASK_TITLE\"              │"
    echo "   │  4. Acceptance: $ACCEPTANCE                                 │"
elif [ "$TASK_AGENT" = "devops" ]; then
    echo "   │  1. Open Kilo Code panel                                    │"
    echo "   │  2. Switch to: Code mode                                    │"
    echo "   │  3. Prompt: \"Work on task $TASK: $TASK_TITLE\"              │"
    echo "   │  4. Acceptance: $ACCEPTANCE                                 │"
elif [ "$TASK_AGENT" = "business" ]; then
    echo "   │  1. Open terminal                                           │"
    echo "   │  2. Run: gemini -p \"Work on task $TASK: $TASK_TITLE\"       │"
    echo "   │  3. Acceptance: $ACCEPTANCE                                 │"
else
    echo "   │  1. Open Kilo Code panel                                    │"
    echo "   │  2. Prompt: \"Work on task $TASK: $TASK_TITLE\"              │"
    echo "   │  3. Acceptance: $ACCEPTANCE                                 │"
fi
echo "   │                                                             │"
echo "   │  OR USE BLACKBOX AI FOR COMPLEX TASKS:                      │"
echo "   │  1. Open Blackbox AI panel                                  │"
echo "   │  2. Enable CyberCoder agent                                 │"
echo "   │  3. Prompt: \"Work on task $TASK: $TASK_TITLE\"              │"
echo "   └─────────────────────────────────────────────────────────────┘"
echo ""

# Step 3: After agent finishes, validate
read -p "✅ Task complete and tests pass? (y/n): " CONFIRM
if [ "$CONFIRM" = "y" ]; then
    jq --arg id "$TASK" '(.backlog[] | select(.id == $id) | .status) = "done"' tasks.json > tasks.tmp.json
    mv tasks.tmp.json tasks.json
    git add -A && git commit -m "feat: complete $TASK — $TASK_TITLE"
    echo "✅ Committed!"
else
    echo "⚠️  Task marked as blocked. Fix issues and run again."
    exit 1
fi

echo "🔄 Run this script again for the next task."
