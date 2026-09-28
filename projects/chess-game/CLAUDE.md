# Chess Game

## Overview
A complete chess game with all legal moves playable (standard chess rules: castling, en passant, promotion, check/checkmate/stalemate/draw detection). Features PvP and vs AI modes with multiple difficulty levels. Built as a vanilla JavaScript project with ES modules.

## Tech Stack
- Frontend: Vanilla JavaScript (ES Modules), HTML5, CSS3
- Game Engine: Custom chess engine with full rules implementation
- AI: Minimax with alpha-beta pruning, iterative deepening
- Styling: CSS Custom Properties (variables), responsive design
- Testing: Vitest for unit tests

## Game Rules (Standard Chess)
- 8x8 board, 16 pieces per side
- All piece movements: King, Queen, Rook, Bishop, Knight, Pawn
- Castling (kingside/queenside) with proper restrictions
- En passant capture
- Pawn promotion (Queen, Rook, Bishop, Knight)
- Check, checkmate, stalemate detection
- Draw rules: 50-move rule, threefold repetition, insufficient material
- FEN import/export for position setup
- PGN export for game recording

## Agent Routing
- Architecture → Architect agent
- Code → Developer agent
- Design → Designer agent
- Testing → Tester agent
- DevOps → DevOps agent

## Project Structure
```
chess-game/
├── index.html           # Main HTML (already exists)
├── chess.js            # Chess engine (to be created)
├── ui.js               # UI controller (to be created)
├── style.css           # Styling (to be created)
├── package.json        # Project config (to be created)
├── tests/
│   └── chess.test.js   # Unit tests (to be created)
├── README.md           # Documentation (to be created)
└── CLAUDE.md           # This file
```