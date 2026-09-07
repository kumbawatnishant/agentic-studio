#!/bin/bash
# ~/agentic-studio/business/content-generator.sh
# Generates human-like social content for project launches and milestones
# Uses Gemini REST API for natural, non-spammy copy
# Output: drafts/ for human review before posting

set -e

if [ -z "${GEMINI_API_KEY:-}" ]; then
    echo "❌ GEMINI_API_KEY is not set."
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DRAFTS_DIR="$PROJECT_DIR/business/drafts"
QUEUE_DIR="$PROJECT_DIR/business/queue"
mkdir -p "$DRAFTS_DIR" "$QUEUE_DIR"

GEMINI_API_URL="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent"

gemini_chat() {
    local prompt="$1"
    local payload
    payload=$(jq -n --arg prompt "$prompt" '{
      contents: [{ parts: [{ text: $prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
    }')

    curl -sS --max-time 60 \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$GEMINI_API_URL?key=${GEMINI_API_KEY}" \
      | jq -r '.candidates[0].content.parts[0].text // empty'
}

# If args provided, generate for a specific project
if [ $# -ge 2 ]; then
    PROJECT_NAME="$1"
    PROJECT_DESC="$2"
    TECH_STACK="${3:-Next.js, Tailwind, Node.js}"
else
    # Auto-detect latest project from projects/ directory
    echo "🔍 Detecting latest project..."
    PROJECT_DIR_SRC="$PROJECT_DIR/projects"
    if [ ! -d "$PROJECT_DIR_SRC" ]; then
        echo "❌ No projects/ directory found."
        exit 1
    fi
    PROJECT_NAME=$(ls -t "$PROJECT_DIR_SRC" | head -1)
    PROJECT_DESC=$(cat "$PROJECT_DIR_SRC/$PROJECT_NAME/README.md" 2>/dev/null | head -20 || echo "A new full-stack application")
    TECH_STACK=$(grep -oP '(?<=tech: \[).*?(?=\])' "$PROJECT_DIR_SRC/$PROJECT_NAME/project.json" 2>/dev/null || echo "Next.js, Tailwind, Node.js")
fi

echo "📝 Generating social content for: $PROJECT_NAME"
DATE=$(date +%Y-%m-%d)
BASE_NAME="${PROJECT_NAME//[^a-zA-Z0-9]/_}"

# 1. LinkedIn post (human tone, brief, specific)
echo "  → LinkedIn post..."
gemini_chat "Write a short LinkedIn post announcing a new project called '$PROJECT_NAME'. Description: $PROJECT_DESC. Tech: $TECH_STACK. Tone: casual developer sharing a win. No jargon soup. Include 2-3 relevant hashtags. Keep it under 300 words. Mention one specific technical challenge you solved. Add a call-to-action: 'Feedback welcome'." \
  > "$DRAFTS_DIR/${BASE_NAME}_linkedin_${DATE}.md"

# 2. Twitter/X thread (concise, hook-first)
echo "  → Twitter thread..."
gemini_chat "Write a Twitter/X thread (5-7 tweets) about shipping '$PROJECT_NAME'. Description: $PROJECT_DESC. Tech: $TECH_STACK. Tone: honest builder. First tweet must hook. Last tweet should invite replies. No emoji spam. Add 2-3 hashtags max." \
  > "$DRAFTS_DIR/${BASE_NAME}_twitter_${DATE}.md"

# 3. Instagram caption (visual-first, short)
echo "  → Instagram caption..."
gemini_chat "Write an Instagram caption for '$PROJECT_NAME'. Description: $PROJECT_DESC. Tech: $TECH_STACK. Tone: excited but not salesy. Max 2200 characters. Include 5-8 relevant hashtags. Ask a question to drive comments. Mention the stack briefly." \
  > "$DRAFTS_DIR/${BASE_NAME}_instagram_${DATE}.md"

# 4. Dev.to / Hashnode article (technical but accessible)
echo "  → Blog post outline..."
gemini_chat "Write a 500-word blog post outline for 'Building $PROJECT_NAME'. Description: $PROJECT_DESC. Tech: $TECH_STACK. Audience: mid-level developers. Include: hook, 3 key technical decisions with rationale, one gotcha, conclusion with repo link placeholder. Tone: practical, not tutorial-bro." \
  > "$DRAFTS_DIR/${BASE_NAME}_blog_${DATE}.md"

# 5. Update portfolio data
echo "  → Updating portfolio data..."
mkdir -p "$PROJECT_DIR/projects/$PROJECT_NAME"
cat > "$PROJECT_DIR/projects/$PROJECT_NAME/project.json" << EOF
{
  "name": "$PROJECT_NAME",
  "description": "$(echo "$PROJECT_DESC" | head -1)",
  "tech": [$(echo "$TECH_STACK" | sed 's/, /\", \"/g' | sed 's/^/\"/;s/$/\"/')],
  "liveUrl": "https://${PROJECT_NAME,,}.vercel.app",
  "githubUrl": "https://github.com/yourusername/$PROJECT_NAME",
  "date": "$DATE",
  "status": "shipped"
}
EOF

# 6. Move to queue for review
echo "  → Queueing for review..."
mv "$DRAFTS_DIR/${BASE_NAME}_"* "$QUEUE_DIR/" 2>/dev/null || true

echo ""
echo "✅ Content generated!"
echo "   Drafts: $QUEUE_DIR"
echo "   Portfolio data: $PROJECT_DIR/projects/$PROJECT_NAME/project.json"
echo ""
echo "Next: Review drafts in $QUEUE_DIR and post manually."
