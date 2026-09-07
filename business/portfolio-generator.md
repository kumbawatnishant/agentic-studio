# Portfolio Generator Task

Generate a developer portfolio site with these requirements:

## Structure
1. **Hero Section**: Name, title, tagline, animated background
2. **Projects Grid**: Pull from `projects/` directory — show 6 latest
3. **Skills**: Animated skill bars for each tech stack
4. **Contact**: Email + Calendly link + GitHub/LinkedIn
5. **Blog** (optional): Link to dev.to or hashnode

## Tech Stack
- Next.js 14 (App Router)
- Tailwind CSS
- Framer Motion for animations
- shadcn/ui components
- Deploy to Vercel (free)

## Data Source
Read `projects/index.json` for project metadata:
```json
{
  "projects": [
    {
      "name": "E-Commerce API",
      "description": "Full-stack e-commerce with Stripe",
      "tech": ["Next.js", "PostgreSQL", "Stripe"],
      "liveUrl": "https://shop-demo.vercel.app",
      "githubUrl": "https://github.com/you/shop",
      "image": "/projects/shop.png"
    }
  ]
}
```

## Rules
- Must score 95+ on Lighthouse
- Must be mobile responsive
- Must load in < 2s
- SEO optimized with next/head
