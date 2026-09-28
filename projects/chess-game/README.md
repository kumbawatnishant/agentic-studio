# Chess Game

A complete chess game implementation with all standard rules, AI opponent, and full test coverage.

## Tech Stack
- **Frontend**: Vanilla JavaScript (ES Modules), HTML5, CSS3
- **Game Engine**: Custom chess engine using 0x88 board representation
- **AI**: Minimax with alpha-beta pruning and iterative deepening
- **Styling**: CSS Custom Properties with responsive design
- **Testing**: Vitest

## Features
- Full chess rules: castling, en passant, pawn promotion
- Check, checkmate, and stalemate detection
- Draw rules: 50-move, threefold repetition, insufficient material
- FEN import/export for position setup
- PGN export for game recording
- PvP mode (two players on same device)
- AI opponent with multiple difficulty levels
- Board flip, undo, hint, and move history
- Promotion modal with piece selection
- Responsive design for mobile and desktop

## Getting Started
```bash
npm install          # Install dependencies
npm run dev          # Start local dev server (requires 'serve' package)
npx serve .          # Or use any static file server
npx vitest run       # Run tests
```

## Project Structure
```
chess-game/
├── index.html           # Main HTML structure
├── chess.js             # Chess engine (board, move gen, AI, FEN/PGN)
├── ui.js                # UI controller (board rendering, events, game flow)
├── style.css            # Complete styling with CSS variables
├── package.json         # Project configuration
├── tests/
│   └── chess.test.js    # Unit tests (61 tests, 100% pass)
├── docs/
│   └── architecture.md  # Architecture documentation
├── tasks.json           # Task backlog
├── CLAUDE.md            # Project guide
└── README.md            # This file
```

## License
MIT
