#!/bin/bash
# ~/agentic-studio/scripts/daily-loop.sh

PROJECT_DIR="$1"
cd "$PROJECT_DIR" || exit 1

echo "🚀 Starting Ralph Loop for $(basename $PROJECT_DIR)"

# Step 1: Pick next task
TASK=$(jq -r '.backlog[] | select(.status == "todo" and (.depends_on | length == 0 or all(.depends_on[] as $d | .backlog[] | select(.id == $d) | .status == "done"))) | .id' tasks.json | head -1)

if [ -z "$TASK" ]; then
    echo "✅ All tasks complete!"
    exit 0
fi

echo "📋 Selected task: $TASK"

# Step 2: Launch Claude Code with the task
# This opens Claude Code — you then tell it: "/agent [agent-name] work on task $TASK"
claude

# Step 3: After Claude Code finishes, validate
# (Manual step — you review the diff)

# Step 4: If tests pass, mark done
read -p "Mark $TASK as done? (y/n): " CONFIRM
if [ "$CONFIRM" = "y" ]; then
    jq --arg id "$TASK" '(.backlog[] | select(.id == $id) | .status) = "done"' tasks.json > tasks.tmp.json
    mv tasks.tmp.json tasks.json
    git add -A && git commit -m "feat: complete $TASK"
    echo "✅ Committed!"
fi

echo "🔄 Run this script again for the next task."
