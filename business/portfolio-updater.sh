#!/bin/bash
# ~/agentic-studio/business/portfolio-updater.sh
# Updates portfolio site with latest projects when tasks are completed
# Reads from projects/*/project.json and regenerates portfolio data

set -e

if [ -z "${GEMINI_API_KEY:-}" ]; then
    echo "❌ GEMINI_API_KEY is not set."
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PORTFOLIO_DATA="$PROJECT_DIR/business/portfolio-data.json"
PROJECTS_DIR="$PROJECT_DIR/projects"

GEMINI_API_URL="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

gemini_chat() {
    local prompt="$1"
    local payload
    payload=$(jq -n --arg prompt "$prompt" '{
      contents: [{ parts: [{ text: $prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
    }')

    curl -sS --max-time 60 \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$GEMINI_API_URL?key=${GEMINI_API_KEY}" \
      | jq -r '.candidates[0].content.parts[0].text // empty'
}

echo "🔄 Updating portfolio data..."

# Collect all project.json files
PROJECTS="[]"
if [ -d "$PROJECTS_DIR" ]; then
    for project_dir in "$PROJECTS_DIR"/*/; do
        [ -f "${project_dir}project.json" ] || continue
        PROJECT_JSON=$(cat "${project_dir}project.json")
        PROJECTS=$(echo "$PROJECTS" | jq --argjson p "$PROJECT_JSON" '. + [$p]')
    done
fi

# Sort by date descending, keep top 6
PROJECTS=$(echo "$PROJECTS" | jq 'sort_by(.date) | reverse | .[0:6]')

# Save updated portfolio data
echo "$PROJECTS" | jq '.' > "$PORTFOLIO_DATA"

echo "✅ Portfolio data updated: $PORTFOLIO_DATA"
echo "   Projects indexed: $(echo "$PROJECTS" | jq 'length')"

# Generate portfolio README if needed
if [ ! -f "$PROJECT_DIR/business/portfolio-README.md" ]; then
    echo "📄 Generating portfolio README..."
    PROJECT_LIST=$(echo "$PROJECTS" | jq -r '.[] | "- [\(.name)](\(.githubUrl // "#")): \(.description)"' | head -20)
    gemini_chat "Write a README.md for a developer portfolio. Include: intro, tech stack summary, projects list, contact section. Projects: $PROJECT_LIST Tone: professional but friendly. Keep it under 200 lines." \
      > "$PROJECT_DIR/business/portfolio-README.md"
fi

echo ""
echo "Next: Deploy portfolio to Vercel if changed."
