#!/bin/bash
# ~/agentic-studio/scripts/new-project.sh
# Headless project initialization for the agentic system
# Usage: bash scripts/new-project.sh <project-name> [tech-stack]

set -e

STUDIO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PROJECTS_DIR="$STUDIO_DIR/projects"

if [ $# -lt 1 ]; then
    echo "Usage: bash scripts/new-project.sh <project-name> [tech-stack]"
    echo ""
    echo "Examples:"
    echo "  bash scripts/new-project.sh my-saas"
    echo "  bash scripts/new-project.sh ecommerce-api 'Next.js, PostgreSQL, Stripe'"
    exit 1
fi

PROJECT_NAME="$1"
TECH_STACK="${2:-Next.js, Tailwind, Node.js}"
PROJECT_DIR="$PROJECTS_DIR/$PROJECT_NAME"

if [ -d "$PROJECT_DIR" ]; then
    echo "❌ Project '$PROJECT_NAME' already exists at $PROJECT_DIR"
    exit 1
fi

echo "🚀 Creating new project: $PROJECT_NAME"
echo "   Tech stack: $TECH_STACK"
echo ""

# 1. Create directory structure
echo "📁 Creating directory structure..."
mkdir -p "$PROJECT_DIR"/{src,tests,docs,deploy,business/leads,.vscode}

# 2. Copy Kilo Code agent configs
echo "⚙️  Copying Kilo Code configs..."
cp "$STUDIO_DIR/.vscode/kilocode-agents/"*.md "$PROJECT_DIR/.vscode/"
cp "$STUDIO_DIR/.vscode/settings.json" "$PROJECT_DIR/.vscode/"

# 3. Create CLAUDE.md
echo "📝 Creating project context..."
cat > "$PROJECT_DIR/CLAUDE.md" << EOF
# $PROJECT_NAME

## Overview
[A one-paragraph description of what this project does]

## Tech Stack
- Frontend: Next.js 14 + Tailwind + shadcn/ui
- Backend: Next.js API Routes / Node.js
- Database: PostgreSQL (Neon free tier)
- Auth: NextAuth.js
- Deploy: Vercel (frontend) + Render (API/DB)

## Architecture Decisions
[Link to docs/architecture.md once created]

## Environment Variables
- DATABASE_URL
- NEXTAUTH_SECRET
- NEXTAUTH_URL

## Agent Routing
- Architecture → Kilo Code Architect mode
- Code → Kilo Code Code mode
- Testing → Kilo Code Debug mode
- Business → Gemini REST API
EOF

# 4. Create tasks.json with template backlog
echo "📋 Creating task backlog..."
cat > "$PROJECT_DIR/tasks.json" << EOF
{
  "project": "$PROJECT_NAME",
  "tech_stack": "$TECH_STACK",
  "backlog": [
    {
      "id": "T001",
      "title": "Scaffold Next.js project with Tailwind and shadcn",
      "agent": "devops",
      "status": "todo",
      "depends_on": [],
      "acceptance": [
        "Project builds with npm run build",
        "Dev server starts with npm run dev",
        "Git initialized with first commit"
      ]
    },
    {
      "id": "T002",
      "title": "Design database schema for core entities",
      "agent": "architect",
      "status": "todo",
      "depends_on": ["T001"],
      "acceptance": [
        "Schema documented in docs/architecture.md",
        "Migration files created",
        "Indexes defined"
      ]
    },
    {
      "id": "T003",
      "title": "Implement auth with NextAuth.js",
      "agent": "developer",
      "status": "todo",
      "depends_on": ["T002"],
      "acceptance": [
        "Login works",
        "Session persists",
        "Protected routes enforced"
      ]
    }
  ]
}
EOF

# 5. Create .gitignore
echo "🔒 Creating .gitignore..."
cat > "$PROJECT_DIR/.gitignore" << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/

# Production
build/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env*.local
.env

# Vercel
.vercel

# TypeScript
*.tsbuildinfo
next-env.d.ts
EOF

# 6. Initialize git
echo "🔀 Initializing git..."
cd "$PROJECT_DIR"
git init
git add -A
git commit -m "chore: init $PROJECT_NAME with agentic system"

# 7. Summary
echo ""
echo "✅ Project created successfully!"
echo ""
echo "   Location: $PROJECT_DIR"
echo "   Tech stack: $TECH_STACK"
echo ""
echo "Next steps:"
echo "  1. cd $PROJECT_DIR"
echo "  2. bash $STUDIO_DIR/scripts/daily-loop.sh ."
echo "  3. Start with T001: Scaffold Next.js project"
echo ""
echo "Or open in VS Code:"
echo "  code $PROJECT_DIR"
