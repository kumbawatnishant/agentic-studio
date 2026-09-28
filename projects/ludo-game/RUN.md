# Run the Ludo Game

## Quick Start (both servers)

```bash
cd agentic-studio/projects/ludo-game

# Run both frontend + socket server together
npm run dev
```

This starts two servers:
- **Frontend**: http://localhost:3000 (or next available port)
- **Socket.io**: http://localhost:3001 (or next available port)

## Or run separately

### Terminal 1 — Frontend
```bash
cd agentic-studio/projects/ludo-game
npx next dev
# or on a specific port: npx next dev -p 3003
```

### Terminal 2 — Socket Server
```bash
cd agentic-studio/projects/ludo-game
SOCKET_PORT=3001 npx tsx server/index.ts
# or different port: SOCKET_PORT=3003 npx tsx server/index.ts
```

If ports 3000/3001 are taken, use different ports and set the environment variable:
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3003 SOCKET_PORT=3002 npx tsx server/index.ts
```

## Test the Engine (21 tests)
```bash
cd agentic-studio/projects/ludo-game
npm run test
```

## Environment Variables

Create a `.env` file in the ludo-game directory:
```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
NEXT_PUBLIC_APP_URL=http://localhost:3000
SOCKET_PORT=3001
```

## How to Play

1. Open http://localhost:3000
2. Click **Play Now** → landing page with rules
3. Click **Create New Room** → enter your name
4. Copy the room code and share it (or join an existing room)
5. Host clicks **Start Game** when everyone is ready
6. Roll the dice → click a highlighted piece to move
7. First to get all 4 pieces home wins!

## Game Rules

- Roll a **6** to move a piece from base to the board
- Move pieces clockwise around the 52-square board
- Land on an opponent to send them back to their base
- Star squares are **safe zones** — opponents can't capture you
- Enter home path by exact count, then move up 6 squares
- Roll **6** again for an extra turn
- First player with all 4 pieces home wins

## Project Structure

```
ludo-game/
├── src/
│   ├── app/              # Next.js App Router (page.tsx, lobby/, game/)
│   ├── components/       # Board, Dice, Pieces, Players
│   ├── lib/
│   │   ├── game/         # Engine (rules, validation, state)
│   │   └── socket/       # Socket.io client hooks
│   ├── server/           # Socket.io server (multiplayer logic)
│   └── types/            # TypeScript types
├── tests/
│   ├── engine.test.ts    # 21 unit tests (all passing)
│   └── e2e/              # Playwright E2E tests
├── server/index.ts       # Entry point for socket server
├── package.json
└── RUN.md                # This file
```
```
