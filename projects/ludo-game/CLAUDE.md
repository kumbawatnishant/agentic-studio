# Ludo Game

## Overview
A real-time multiplayer Ludo game with a modern, responsive theme. Built with Next.js 14, TypeScript, Tailwind CSS, and Socket.io for real-time gameplay. Supports 2-4 players with full Ludo rules including safe zones, home paths, and winning conditions.

## Tech Stack
- Frontend: Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS
- Backend: Next.js API Routes + Socket.io server
- Real-time: Socket.io for multiplayer synchronization
- State: React Context + useReducer for game state
- Styling: Tailwind CSS with custom theme (CSS variables)
- Testing: Vitest + React Testing Library + Playwright
- Deploy: Vercel (frontend) + Render (Socket.io server)

## Game Rules (Standard Ludo)
- 2-4 players, each with 4 pieces
- Roll 6 to move piece from base to start
- Move pieces clockwise around board
- Land on opponent = send them back to base
- Safe zones (star squares) protect pieces
- Enter home path on exact roll
- First to get all 4 pieces home wins

## Agent Routing
- Architecture → Kilo Code Architect mode
- Code → Kilo Code Code mode
- Testing → Kilo Code Debug mode
- Business → Gemini REST API

## Project Structure
```
ludo-game/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API routes
│   │   ├── game/              # Game page
│   │   ├── lobby/             # Lobby page
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css        # Global styles + theme
│   ├── components/            # React components
│   │   ├── board/            # Board, cells, paths
│   │   ├── dice/             # Dice component
│   │   ├── pieces/           # Player pieces
│   │   ├── players/          # Player info, turn indicator
│   │   ├── lobby/            # Lobby UI
│   │   └── ui/               # Reusable UI components
│   ├── lib/                   # Core logic
│   │   ├── game/             # Game engine, rules
│   │   ├── socket/           # Socket.io client
│   │   └── utils/            # Helpers
│   ├── hooks/                 # Custom React hooks
│   ├── types/                 # TypeScript types
│   └── styles/                # Theme, Tailwind config
├── server/                    # Socket.io server
├── tests/                     # Tests
├── docs/                      # Documentation
└── deploy/                    # Deployment configs
```