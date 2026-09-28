# Chess Game Architecture

## 1. Board Representation: 0x88

### Rationale
- Simpler implementation than bitboards for vanilla JS
- Efficient move generation with built-in bounds checking
- Fast square indexing and attack detection
- Memory efficient (128-element array vs 64)

### Layout
```
0x00 0x01 0x02 0x03 0x04 0x05 0x06 0x07  0x08-0x0F (invalid)
0x10 0x11 0x12 0x13 0x14 0x15 0x16 0x17  0x18-0x1F (invalid)
0x20 0x21 0x22 0x23 0x24 0x25 0x26 0x27  0x28-0x2F (invalid)
0x30 0x31 0x32 0x33 0x34 0x35 0x36 0x37  0x38-0x3F (invalid)
0x40 0x41 0x42 0x43 0x44 0x45 0x46 0x47  0x48-0x4F (invalid)
0x50 0x51 0x52 0x53 0x54 0x55 0x56 0x57  0x58-0x5F (invalid)
0x60 0x61 0x62 0x63 0x64 0x65 0x66 0x67  0x68-0x6F (invalid)
0x70 0x71 0x72 0x73 0x74 0x75 0x76 0x77  0x78-0x7F (invalid)
```

### Square Mapping
- A1 = 0x00, H1 = 0x07
- A8 = 0x70, H8 = 0x77
- Rank = square >> 4, File = square & 0x07
- Valid square: `(square & 0x88) === 0`

### Piece Encoding (4 bits)
```
0: Empty
1: White Pawn    9: Black Pawn
2: White Knight  10: Black Knight
3: White Bishop  11: Black Bishop
4: White Rook    12: Black Rook
5: White Queen   13: Black Queen
6: White King    14: Black King
```

Color: `piece >> 3` (0=white, 1=black)
Type: `piece & 0x07`

## 2. Move Generation

### Move Representation (32-bit integer)
```
Bits 0-6:   Source square (0-127)
Bits 7-13:  Target square (0-127)
Bits 14-16: Promotion piece (0=none, 1=knight, 2=bishop, 3=rook, 4=queen)
Bit 17:     En passant flag
Bit 18:     Castling flag
Bits 19-20: Move type (0=normal, 1=capture, 2=enpassant, 3=castling, 4=promotion)
Bits 21-31: Reserved
```

### Move Generation Phases
1. **Generate pseudo-legal moves** - All piece moves ignoring check
2. **Filter legal moves** - Make/unmake each move, test if king in check

### Piece Move Tables (Precomputed)
- Knight offsets: `[-33, -31, -18, -14, 14, 18, 31, 33]`
- King offsets: `[-17, -16, -15, -1, 1, 15, 16, 17]`
- Bishop/Rook/Queen directions with ray iteration
- Pawn moves: forward, double push, captures, promotions

### Special Move Handling
- **Castling**: Check rights, path clear, not in/check through check
- **En passant**: Track last double-pawn push, validate capture square
- **Promotion**: Generate 4 promotion moves for pawn reaching 8th/1st rank

## 3. Game State

### State Structure
```javascript
const GameState = {
  board: Uint8Array(128),        // 0x88 board array
  sideToMove: 0,                 // 0=white, 1=black
  castlingRights: 0,             // Bitmask: WK=1, WQ=2, BK=4, BQ=8
  enPassantSquare: 0,            // 0x88 square or 0 if none
  halfmoveClock: 0,              // 50-move rule counter
  fullmoveNumber: 1,             // Full move counter
  zobristHash: 0,                // Position hash for repetition
  moveHistory: [],               // Stack of Move objects for undo
  positionHistory: Map(),        // Hash -> count for repetition
  
  // Cached
  whiteKingSquare: 0,
  blackKingSquare: 0,
  inCheck: false,
  checkers: [],                  // Squares attacking king
  pinnedPieces: [],              // Pinned piece info
};
```

### Castling Rights Bitmask
```
Bit 0 (1): White Kingside  (e1-g1)
Bit 1 (2): White Queenside (e1-c1)
Bit 2 (4): Black Kingside  (e8-g8)
Bit 3 (8): Black Queenside (e8-c8)
```

### Zobrist Hashing
- 768 random numbers: 12 piece types × 64 squares
- 16 random numbers: castling rights combinations
- 8 random numbers: en passant files
- 1 random number: side to move
- Update incrementally on make/unmake move

## 4. FEN/PGN Support

### FEN Parser/Serializer
**FEN Fields:**
1. Piece placement (rank 8 to 1, files a-h)
2. Side to move (w/b)
3. Castling availability (KQkq/-)
4. En passant square (algebraic or -)
5. Halfmove clock (50-move rule)
6. Fullmove number

**Parsing:**
- Iterate ranks 8→1, files a→h
- Map piece chars to internal encoding
- Validate: exactly 1 king per side, valid piece counts

**Serialization:**
- Iterate board ranks 8→1
- Compress empty squares to numbers
- Encode castling rights from bitmask
- Format en passant square

### PGN Exporter
**Headers:**
- Event, Site, Date, Round, White, Black, Result
- Optional: WhiteElo, BlackElo, TimeControl, ECO

**Move Text:**
- SAN (Standard Algebraic Notation) generation
- Disambiguation for identical pieces
- Check (+), Checkmate (#) suffixes
- Castling: O-O, O-O-O
- Promotion: e8=Q

**SAN Generation:**
- From move + board state, determine piece
- Check for captures, checks, promotions
- Disambiguate if multiple same-type pieces can reach target

## 5. Engine API Contracts

### ChessEngine Class
```javascript
class ChessEngine {
  // Construction
  constructor()
  static fromFEN(fen)          // Create from FEN string
  static fromPGN(pgn)          // Create from PGN (headers + moves)
  
  // Position Management
  getFEN()                     // Current position as FEN
  getPGN()                     // Game as PGN string
  loadFEN(fen)                 // Load position from FEN
  loadPGN(pgn)                 // Load game from PGN
  
  // Move Generation
  generateMoves()              // Returns Move[] (legal moves)
  generatePseudoLegalMoves()   // Returns Move[] (ignores check)
  isLegalMove(move)            // Boolean validation
  
  // Move Execution
  makeMove(move)               // Apply move, update state, returns bool
  unmakeMove()                 // Undo last move, returns Move
  
  // Game State Queries
  isInCheck()                  // Side to move in check?
  isCheckmate()                // Checkmate?
  isStalemate()                // Stalemate?
  isDraw()                     // Any draw condition?
  getGameResult()              // 'white' | 'black' | 'draw' | null
  
  // Draw Detection
  canClaimDraw()               // 50-move or repetition claimable
  isInsufficientMaterial()     // K vs K, K+B vs K, K+N vs K
  
  // AI Interface
  evaluate()                   // Static evaluation (centipawns)
  search(depth, timeLimit)     // Returns best Move
  setDifficulty(level)         // 1-10 or 'easy'|'medium'|'hard'
  
  // Utilities
  clone()                      // Deep copy of engine state
  getBoard()                   // Copy of 0x88 board array
  getMoveHistory()             // Copy of move stack
  squareToAlgebraic(sq)        // 0x88 -> 'e4'
  algebraicToSquare(str)       // 'e4' -> 0x88
}
```

### Move Object
```javascript
const Move = {
  from: 0,         // Source square (0x88)
  to: 0,           // Target square (0x88)
  promotion: 0,    // 0=none, 1=N, 2=B, 3=R, 4=Q
  flags: 0,        // Bit flags: ep=1, castle=2, promo=4, capture=8
  san: '',         // SAN string (generated on demand)
  captured: 0,     // Captured piece type (for unmake)
};
```

### AI Engine Interface
```javascript
class AIEngine {
  constructor(chessEngine)
  
  // Search
  findBestMove(depth, timeMs)  // Returns Move
  stopSearch()                 // Interrupt iterative deepening
  
  // Configuration
  setDepth(maxDepth)
  setTimeLimit(ms)
  setDifficulty(level)         // Adjusts depth/time/eval complexity
  
  // Evaluation
  evaluatePosition()           // Centipawns from side to move perspective
  
  // Callbacks
  onNodeSearch(nodeCount)      // Progress callback
  onDepthComplete(depth, score, pv) // Iterative deepening callback
}
```

### Evaluation Function Components
```
Material:      Pawn=100, Knight=320, Bishop=330, Rook=500, Queen=900
PST:           Piece-Square Tables for each piece type
King Safety:   Pawn shield, open files near king, attack count
Mobility:      Legal move count bonus
Pawn Structure: Doubled, isolated, backward, passed pawns
Center Control: e4/d4/e5/d5 occupation and attacks
Tempo:         Side to move bonus
```

## 6. Module Structure

```
chess-game/
├── src/
│   ├── engine/
│   │   ├── Board.js           # 0x88 board operations
│   │   ├── Move.js            # Move encoding/decoding
│   │   ├── MoveGen.js         # Pseudo-legal move generation
│   │   ├── Validation.js      # Legality checking (make/unmake)
│   │   ├── GameState.js       # State management
│   │   ├── FEN.js             # FEN parse/serialize
│   │   ├── PGN.js             # PGN parse/serialize
│   │   ├── Evaluation.js      # Static evaluation
│   │   ├── Search.js          # Minimax + alpha-beta + iterative deepening
│   │   ├── Zobrist.js         # Hashing for repetition
│   │   └── ChessEngine.js     # Main facade class
│   ├── ai/
│   │   └── AIEngine.js        # AI wrapper with difficulty levels
│   └── index.js               # Exports
├── tests/
│   ├── engine.test.js
│   ├── fen.test.js
│   ├── pgn.test.js
│   └── search.test.js
└── docs/
    └── architecture.md
```

## 7. Performance Considerations

- **Move Generation**: ~2-5M moves/sec in JS
- **Search**: Iterative deepening with aspiration windows
- **Transposition Table**: Optional SimpleArray for caching (size ~1M entries)
- **Move Ordering**: Captures first (MVV-LVA), killers, history heuristic
- **Pruning**: Null move, futility, delta pruning at higher depths

## 8. Testing Strategy

- **Perft Testing**: Validate move generation at depths 1-6 from known positions
- **FEN Round-trip**: Parse → serialize → parse equivalence
- **PGN Round-trip**: Export → import → export equivalence
- **Known Positions**: Test checkmate, stalemate, draw detection
- **Search Consistency**: Same position + depth = same best move