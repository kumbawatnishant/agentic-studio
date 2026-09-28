# Ludo Master

A real-time multiplayer Ludo game built with Next.js 14, TypeScript, Tailwind CSS, and Socket.io.

## Features

- 🎮 **Real-time Multiplayer** - Play with 2-4 players using Socket.io
- 🎨 **Modern Theme** - Beautiful, responsive design with custom Ludo color palette
- 📱 **Fully Responsive** - Works on desktop, tablet, and mobile
- 🔒 **Fair Play** - Server-authoritative game logic prevents cheating
- 🏆 **Complete Rules** - Standard Ludo rules with safe zones, home paths, and captures
- ⚡ **Instant Play** - No registration required, just enter a name and play

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Real-time**: Socket.io for multiplayer synchronization
- **State Management**: React Context + useReducer
- **Animations**: Framer Motion
- **Testing**: Vitest (unit), Playwright (E2E)
- **Deployment**: Vercel (frontend) + Render (Socket.io server)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Navigate to project directory
cd agentic-studio/projects/ludo-game

# Install dependencies
npm install

# Start development servers (Next.js + Socket.io)
npm run dev
```

The game will be available at:
- Frontend: http://localhost:3000
- Socket.io Server: http://localhost:3001

### Available Scripts

```bash
npm run dev          # Start both Next.js and Socket.io servers
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run unit tests
npm run test:watch   # Run tests in watch mode
npm run test:e2e     # Run E2E tests with Playwright
```

## Project Structure

```
ludo-game/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── lobby/             # Lobby page (create/join rooms)
│   │   ├── game/              # Game page
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles + theme
│   ├── components/
│   │   ├── board/             # Game board components
│   │   ├── dice/              # Dice component with 3D animation
│   │   ├── pieces/            # Game piece components
│   │   └── players/           # Player info, turn indicator
│   ├── lib/
│   │   ├── game/              # Game engine (rules, validation)
│   │   └── socket/            # Socket.io client hooks
│   ├── server/                # Socket.io server
│   ├── types/                 # TypeScript type definitions
│   └── styles/                # Additional styles
├── tests/
│   ├── engine.test.ts         # Game engine unit tests
│   ├── setup.ts               # Test setup
│   └── e2e/                   # Playwright E2E tests
├── server/                    # Socket.io server entry point
├── package.json
├── tsconfig.json
├── tailwind.config.js
├── next.config.js
├── vitest.config.ts
├── playwright.config.ts
└── tasks.json                 # Agentic Studio task backlog
```

## Game Rules

1. **Setup**: 2-4 players, each with 4 pieces in their colored base
2. **Rolling**: Click dice to roll. Need a **6** to move a piece from base to start
3. **Movement**: Click a highlighted piece to move it clockwise around the 52-square board
4. **Capturing**: Land on an opponent's piece to send it back to their base
5. **Safe Zones**: Star-marked squares protect pieces from capture
6. **Home Path**: Enter by exact count from your starting area, then move up 6 squares
7. **Winning**: First player to get all 4 pieces home wins!

## Socket.io Events

### Client → Server
- `room:create` - Create a new game room
- `room:join` - Join existing room by code
- `room:leave` - Leave current room
- `game:start` - Start the game (host only)
- `game:roll-dice` - Roll the dice
- `game:move-piece` - Move a piece
- `game:pass-turn` - Pass turn (when no valid moves)

### Server → Client
- `room:created` - Room created successfully
- `room:joined` - Joined room successfully
- `room:player-joined` - New player joined
- `game:started` - Game started
- `game:state` - Full game state update
- `game:turn-changed` - Turn changed
- `game:dice-rolled` - Dice rolled
- `game:piece-moved` - Piece moved
- `game:piece-captured` - Piece captured
- `game:won` - Game won

## Deployment

### Vercel (Frontend)
1. Connect repository to Vercel
2. Add environment variables:
   - `NEXT_PUBLIC_SOCKET_URL` - Your Socket.io server URL
3. Deploy

### Render (Socket.io Server)
1. Create new Web Service
2. Build command: `npm install`
3. Start command: `npm run start`
4. Add environment variables:
   - `SOCKET_PORT` - Port for Socket.io (default 3001)
   - `NEXT_PUBLIC_APP_URL` - Your Vercel deployment URL

## Development

### Running with Agentic Studio

This project is set up for Agentic Studio's Ralph Loop workflow:

```bash
# From agentic-studio root
bash scripts/daily-loop.sh projects/ludo-game
```

### Task Backlog

See `tasks.json` for the complete task backlog with dependencies.

## License

MIT License - feel free to use for learning or commercial projects!

---

Built with ❤️ using Agentic Studio