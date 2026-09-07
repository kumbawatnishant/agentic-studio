#!/bin/bash
# ~/agentic-studio/business/daily-scout.sh
# Daily job scout and outreach automation using Gemini CLI
# Requires: npm install -g @google/gemini-cli && gemini auth login

set -e

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LEADS_DIR="$PROJECT_DIR/business/leads"
APPLICATIONS_DIR="$PROJECT_DIR/business/applications"
OUTREACH_DIR="$PROJECT_DIR/business/outreach"

mkdir -p "$LEADS_DIR" "$APPLICATIONS_DIR" "$OUTREACH_DIR"

echo "🔍 Starting daily job scout with Gemini CLI..."

# 1. Find fresh remote full-stack roles from LinkedIn/Indeed/RSS
echo "📡 Scanning job boards..."
gemini -p "You are a job search assistant. Search LinkedIn, Indeed, and RemoteOK for remote Full-Stack Developer, React Developer, and Node.js Developer roles posted in the last 24 hours. For each role return: company, role, url, tech_stack, location, posted_date. Format as JSON array. No commentary." \
  --output-format json \
  --output-file "$LEADS_DIR/jobs_raw_$(date +%Y-%m-%d).json" 2>/dev/null || true

if [ ! -f "$LEADS_DIR/jobs_raw_$(date +%Y-%m-%d).json" ]; then
    echo "⚠️  Gemini output format not supported, using text mode..."
    gemini -p "Search LinkedIn, Indeed, and RemoteOK for remote Full-Stack Developer, React Developer, and Node.js Developer roles posted in the last 24 hours. For each role return: company, role, url, tech_stack, location, posted_date. Format as plain text list. No commentary." \
      > "$LEADS_DIR/jobs_raw_$(date +%Y-%m-%d).txt"
fi

# 2. Score and filter leads
echo "🎯 Scoring leads..."
gemini -p "You are a recruiting assistant. Read the job listings from $LEADS_DIR/jobs_raw_$(date +%Y-%m-%d).json or the adjacent text file. Score each role 0-100 for match against: React, Next.js, Node.js, TypeScript, PostgreSQL, Tailwind. Return JSON array with fields: company, role, url, tech_stack, match_score, reason. Only include roles with match_score >= 60." \
  --output-format json \
  --output-file "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" 2>/dev/null || {
    echo "⚠️  Falling back to text scoring output..."
    gemini -p "You are a recruiting assistant. Score each job listing 0-100 for match against: React, Next.js, Node.js, TypeScript, PostgreSQL, Tailwind. Return plain text list with company, role, url, match_score. Only include roles with match_score >= 60." \
      > "$LEADS_DIR/scored_$(date +%Y-%m-%d).txt"
  }

# 3. Generate tailored resumes and cover letters for top 5 matches
echo "✍️  Generating tailored applications..."
if command -v jq >/dev/null 2>&1 && [ -f "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" ]; then
    COUNT=$(jq 'length' "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" 2>/dev/null || echo 0)
    if [ "$COUNT" -gt 0 ]; then
        for i in $(seq 0 $((COUNT > 5 ? 4 : COUNT - 1))); do
            COMPANY=$(jq -r ".[$i].company // \"unknown\"" "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" 2>/dev/null || echo "unknown")
            ROLE=$(jq -r ".[$i].role // \"developer\"" "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" 2>/dev/null || echo "developer")
            
            echo "  → $COMPANY — $ROLE"
            
            # Generate cover letter
            gemini -p "Write a 200-word tailored cover letter for $ROLE at $COMPANY. Highlight: React, Next.js, Node.js, TypeScript, PostgreSQL, Tailwind. Mention shipping production apps to Vercel. Tone: confident but concise. No placeholders." \
              > "$APPLICATIONS_DIR/${COMPANY//[^a-zA-Z0-9]/_}_${ROLE//[^a-zA-Z0-9]/_}_cover_letter.md"
            
            # Generate outreach email
            gemini -p "Write a 3-sentence cold outreach email to hiring managers at $COMPANY for a $ROLE role. Focus on one specific value: shipping production apps fast with React/Next.js/Node.js. No fluff, no placeholders." \
              > "$OUTREACH_DIR/${COMPANY//[^a-zA-Z0-9]/_}_outreach.txt"
        done
    else
        echo "ℹ️  No high-scoring matches found today."
    fi
else
    echo "⚠️  jq not found or scored JSON missing. Skipping bulk generation."
    echo "   Install jq with: sudo apt install -y jq"
fi

# 4. Update leads index
echo "📊 Updating leads index..."
{
    echo "# Business Leads — $(date +%Y-%m-%d)"
    echo ""
    echo "| Company | Role | Match | Date |"
    echo "|---------|------|-------|------|"
    
    if [ -f "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" ] && command -v jq >/dev/null 2>&1; then
        jq -r '.[] | "| \(.company) | \(.role) | \(.match_score)% | \(.posted_date // "today") |"' "$LEADS_DIR/scored_$(date +%Y-%m-%d).json" 2>/dev/null || true
    elif [ -f "$LEADS_DIR/scored_$(date +%Y-%m-%d).txt" ]; then
        cat "$LEADS_DIR/scored_$(date +%Y-%m-%d).txt" 2>/dev/null || true
    fi
} > "$LEADS_DIR/INDEX_$(date +%Y-%m-%d).md"

# 5. Summary
echo ""
echo "✅ Daily scout complete!"
echo "   Leads: $LEADS_DIR"
echo "   Applications: $APPLICATIONS_DIR"
echo "   Outreach: $OUTREACH_DIR"
echo ""
echo "Next: Review $LEADS_DIR/INDEX_$(date +%Y-%m-%d).md and approve outreach."
