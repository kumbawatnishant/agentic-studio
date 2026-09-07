# Gemini CLI Configuration
# Install: npm install -g @google/gemini-cli
# Auth: gemini auth login
# Docs: https://ai.google.dev/gemini-api/docs/cli

# Free tier limits (as of 2026):
# - 1,000 requests per day
# - 60 RPM
# - 1M input tokens per minute
# Model: gemini-2.0-flash (fast, free tier)

# Environment variables (optional)
# GEMINI_API_KEY=your-api-key
# GEMINI_MODEL=gemini-2.0-flash

# Common flags:
# -p, --prompt TEXT       Prompt to send (required)
# -o, --output FILE       Write response to file
# --output-format FORMAT  json|text|markdown (experimental)
# -c, --continue          Continue last conversation
# -m, --model MODEL       Override model (e.g. gemini-2.0-flash)

# Example: Generate a cover letter
# gemini -p "Write a cover letter for a React developer role at TechCorp" -o cover.txt

# Example: JSON output for scripting
# gemini -p "Return JSON array of 3 project ideas" --output-format json

# Example: Multi-turn conversation
# gemini -p "Review this code for security issues: $(cat app.js)" -o review.txt
