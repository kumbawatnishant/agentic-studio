#!/bin/bash
# ~/agentic-studio/business/daily-scout.sh
# Daily job scout and outreach automation using Gemini REST API directly
# Requires: GEMINI_API_KEY environment variable and jq

set -e

if [ -z "${GEMINI_API_KEY:-}" ]; then
    echo "❌ GEMINI_API_KEY is not set. Add it to ~/.bashrc or export it in this session."
    exit 1
fi

if ! command -v jq >/dev/null 2>&1; then
    echo "❌ jq is required. Install it with: sudo apt install -y jq"
    exit 1
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LEADS_DIR="$PROJECT_DIR/business/leads"
APPLICATIONS_DIR="$PROJECT_DIR/business/applications"
OUTREACH_DIR="$PROJECT_DIR/business/outreach"

mkdir -p "$LEADS_DIR" "$APPLICATIONS_DIR" "$OUTREACH_DIR"

GEMINI_API_URL="https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

gemini_chat() {
    local prompt="$1"
    local payload
    payload=$(jq -n --arg prompt "$prompt" '{
      contents: [{ parts: [{ text: $prompt }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
    }')

    curl -sS --max-time 60 \
      -H "Content-Type: application/json" \
      -d "$payload" \
      "$GEMINI_API_URL?key=${GEMINI_API_KEY}" \
      | jq -r '.candidates[0].content.parts[0].text // empty'
}

echo "🔍 Starting daily job scout with Gemini REST API..."

# 1. Find fresh remote full-stack roles
echo "📡 Scanning job boards..."
RAW_JOBS=$(gemini_chat "You are a job search assistant. Search LinkedIn, Indeed, and RemoteOK for remote Full-Stack Developer, React Developer, and Node.js Developer roles posted in the last 24 hours. For each role return: company, role, url, tech_stack, location, posted_date. Return ONLY valid JSON array. No commentary, no markdown fences.")
echo "$RAW_JOBS" > "$LEADS_DIR/jobs_raw_$(date +%Y-%m-%d).json" || true

# 2. Score and filter leads
echo "🎯 Scoring leads..."
SCORED=$(gemini_chat "You are a recruiting assistant. Score each job listing 0-100 for match against: React, Next.js, Node.js, TypeScript, PostgreSQL, Tailwind. Return ONLY valid JSON array with fields: company, role, url, tech_stack, match_score, reason. Only include roles with match_score >= 60. No commentary, no markdown fences.")
echo "$SCORED" > "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" || true

# 3. Generate tailored applications for top matches
echo "✍️  Generating tailored applications..."
COUNT=$(jq 'length' "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" 2>/dev/null || echo 0)
if [ "$COUNT" -gt 0 ]; then
    for i in $(seq 0 $((COUNT > 5 ? 4 : COUNT - 1))); do
        COMPANY=$(jq -r ".[$i].company // \"unknown\"" "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" 2>/dev/null || echo "unknown")
        ROLE=$(jq -r ".[$i].role // \"developer\"" "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" 2>/dev/null || echo "developer")
        echo "  → $COMPANY — $ROLE"

        COVER_LETTER=$(gemini_chat "Write a 200-word tailored cover letter for $ROLE at $COMPANY. Highlight: React, Next.js, Node.js, TypeScript, PostgreSQL, Tailwind. Mention shipping production apps to Vercel. Tone: confident but concise. No placeholders.")
        echo "$COVER_LETTER" > "$APPLICATIONS_DIR/${COMPANY//[^a-zA-Z0-9]/_}_${ROLE//[^a-zA-Z0-9]/_}_cover_letter.md"

        OUTREACH=$(gemini_chat "Write a 3-sentence cold outreach email to hiring managers at $COMPANY for a $ROLE role. Focus on one specific value: shipping production apps fast with React/Next.js/Node.js. No fluff, no placeholders.")
        echo "$OUTREACH" > "$OUTREACH_DIR/${COMPANY//[^a-zA-Z0-9]/_}_outreach.txt"
    done
else
    echo "ℹ️  No high-scoring matches found today."
fi

# 4. Update leads index
echo "📊 Updating leads index..."
{
    echo "# Business Leads — $(date +%Y-%m-%d)"
    echo ""
    echo "| Company | Role | Match | Date |"
    echo "|---------|------|-------|------|"
    if [ -f "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" ]; then
        jq -r '.[] | "| \(.company) | \(.role) | \(.match_score)% | \(.posted_date // "today") |"' "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" 2>/dev/null || true
    fi
} > "$LEADS_DIR/INDEX_$(date +%Y-%m-%d).md"

echo ""
echo "✅ Daily scout complete!"
echo "   Leads: $LEADS_DIR"
echo "   Applications: $APPLICATIONS_DIR"
echo "   Outreach: $OUTREACH_DIR"
echo ""
echo "Next: Review $LEADS_DIR/INDEX_$(date +%Y-%m-%d).md and approve outreach."
