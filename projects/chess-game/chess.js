// Chess Engine - Complete implementation using 0x88 board representation
// ES Module exports

export const PIECES = {
  KING: 'k',
  QUEEN: 'q',
  ROOK: 'r',
  BISHOP: 'b',
  KNIGHT: 'n',
  PAWN: 'p'
};

export const COLORS = {
  WHITE: 'w',
  BLACK: 'b'
};

export const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// Internal piece encoding
const EMPTY = 0;
const WP = 1, WN = 2, WB = 3, WR = 4, WQ = 5, WK = 6;
const BP = 9, BN = 10, BB = 11, BR = 12, BQ = 13, BK = 14;

const PIECE_VALUES = {
  [WP]: 100, [BP]: 100,
  [WN]: 320, [BN]: 320,
  [WB]: 330, [BB]: 330,
  [WR]: 500, [BR]: 500,
  [WQ]: 900, [BQ]: 900,
  [WK]: 20000, [BK]: 20000
};

// Move flags
const FLAGS = {
  NORMAL: 0,
  CAPTURE: 1,
  EN_PASSANT: 2,
  CASTLING: 4,
  PROMOTION: 8
};

const KNIGHT_OFFSETS = [-33, -31, -18, -14, 14, 18, 31, 33];
const KING_OFFSETS = [-17, -16, -15, -1, 1, 15, 16, 17];
const BISHOP_DIRS = [-17, -15, 15, 17];
const ROOK_DIRS = [-16, -1, 1, 16];
const QUEEN_DIRS = [-17, -16, -15, -1, 1, 15, 16, 17];

const CASTLING = {
  WHITE_KINGSIDE: 1,
  WHITE_QUEENSIDE: 2,
  BLACK_KINGSIDE: 4,
  BLACK_QUEENSIDE: 8
};

const INVALID = 0x88;

// Move class
class Move {
  constructor(from = 0, to = 0, promotion = 0, flags = 0, captured = 0) {
    this.from = from;
    this.to = to;
    this.promotion = promotion;
    this.flags = flags;
    this.captured = captured;
  }
  get isCapture() { return (this.flags & FLAGS.CAPTURE) !== 0; }
  get isEnPassant() { return (this.flags & FLAGS.EN_PASSANT) !== 0; }
  get isCastling() { return (this.flags & FLAGS.CASTLING) !== 0; }
  get isPromotion() { return (this.flags & FLAGS.PROMOTION) !== 0; }
  clone() { return new Move(this.from, this.to, this.promotion, this.flags, this.captured); }
  toJSON() {
    return { from: this.from, to: this.to, promotion: this.promotion, flags: this.flags, captured: this.captured };
  }
}

// Utility functions
function algebraicToSquare(alg) {
  if (typeof alg !== 'string' || alg.length !== 2) return INVALID;
  const file = alg.charCodeAt(0) - 97;
  const rank = parseInt(alg[1]) - 1;
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return INVALID;
  return rank * 16 + file;
}

function squareToAlgebraic(sq) {
  if ((sq & 0x88) !== 0) return '';
  const file = sq & 0x07;
  const rank = sq >> 4;
  return String.fromCharCode(97 + file) + (rank + 1);
}

function getPieceType(piece) {
  if (piece === 0) return 0;
  return piece < 7 ? piece : piece & 0x07;
}

function getPieceColor(piece) {
  if (piece === 0) return null;
  return piece < 7 ? COLORS.WHITE : COLORS.BLACK;
}

function isWhitePiece(piece) { return piece >= 1 && piece <= 6; }
function isBlackPiece(piece) { return piece >= 9 && piece <= 14; }
function isPawn(piece) { return piece === WP || piece === BP; }
function isKnight(piece) { return piece === WN || piece === BN; }
function isBishop(piece) { return piece === WB || piece === BB; }
function isRook(piece) { return piece === WR || piece === BR; }
function isQueen(piece) { return piece === WQ || piece === BQ; }
function isKing(piece) { return piece === WK || piece === BK; }

function pieceToSymbol(piece) {
  const map = { 1:'P',2:'N',3:'B',4:'R',5:'Q',6:'K',9:'p',10:'n',11:'b',12:'r',13:'q',14:'k' };
  return map[piece] || '';
}

function pieceToUnicode(piece) {
  const map = {
    1:'\u2659', 9:'\u265F', 2:'\u2658', 10:'\u265E',
    3:'\u2657', 11:'\u265D', 4:'\u2656', 12:'\u265C',
    5:'\u2655', 13:'\u265B', 6:'\u2654', 14:'\u265A'
  };
  return map[piece] || '';
}

function parsePieceChar(c) {
  const map = { 'P':1,'N':2,'B':3,'R':4,'Q':5,'K':6,'p':9,'n':10,'b':11,'r':12,'q':13,'k':14 };
  return map[c] || 0;
}

function parseFEN(fen) {
  const parts = fen.split(' ');
  if (parts.length < 4) throw new Error('Invalid FEN');

  const board = new Uint8Array(128);
  const ranks = parts[0].split('/');

  for (let rank = 0; rank < 8; rank++) {
    const row = ranks[rank];
    let file = 0;
    for (const char of row) {
      if (char >= '0' && char <= '9') {
        file += parseInt(char);
      } else {
        board[(7 - rank) * 16 + file] = parsePieceChar(char);
        file++;
      }
    }
  }

  const sideToMove = parts[1].toLowerCase() === 'w' ? COLORS.WHITE : COLORS.BLACK;

  let castlingRights = 0;
  const cf = parts[2];
  if (cf.includes('K')) castlingRights |= CASTLING.WHITE_KINGSIDE;
  if (cf.includes('Q')) castlingRights |= CASTLING.WHITE_QUEENSIDE;
  if (cf.includes('k')) castlingRights |= CASTLING.BLACK_KINGSIDE;
  if (cf.includes('q')) castlingRights |= CASTLING.BLACK_QUEENSIDE;

  let ep = INVALID;
  if (parts[3] !== '-') {
    ep = algebraicToSquare(parts[3]);
  }

  return {
    board,
    sideToMove,
    castlingRights,
    enPassantSquare: ep,
    halfmoveClock: parseInt(parts[4] || '0'),
    fullmoveNumber: parseInt(parts[5] || '1')
  };
}

function generateFEN(board, sideToMove, castlingRights, ep, halfmoveClock, fullmoveNumber) {
  let placement = '';
  for (let rank = 7; rank >= 0; rank--) {
    let empty = 0;
    for (let file = 0; file < 8; file++) {
      const piece = board[rank * 16 + file];
      if (piece === 0) {
        empty++;
      } else {
        if (empty > 0) { placement += empty; empty = 0; }
        placement += pieceToSymbol(piece);
      }
    }
    if (empty > 0) placement += empty;
    if (rank > 0) placement += '/';
  }

  let castling = '';
  if (castlingRights & CASTLING.WHITE_KINGSIDE) castling += 'K';
  if (castlingRights & CASTLING.WHITE_QUEENSIDE) castling += 'Q';
  if (castlingRights & CASTLING.BLACK_KINGSIDE) castling += 'k';
  if (castlingRights & CASTLING.BLACK_QUEENSIDE) castling += 'q';
  if (!castling) castling = '-';

  const epStr = ep !== INVALID ? squareToAlgebraic(ep) : '-';

  return `${placement} ${sideToMove === COLORS.WHITE ? 'w' : 'b'} ${castling} ${epStr} ${halfmoveClock} ${fullmoveNumber}`;
}

function findKing(board, color) {
  const king = color === COLORS.WHITE ? WK : BK;
  for (let i = 0; i < 128; i++) {
    if ((i & 0x88) === 0 && board[i] === king) return i;
  }
  return INVALID;
}

// Check if square is attacked by a given color
function isSquareAttacked(board, sq, attackerColor) {
  if ((sq & 0x88) !== 0) return false;

  // Pawn attacks: a white pawn at sq attacks sq+15 and sq+17
  // To check if sq is attacked by white pawn, look at sq-15 and sq-17 for white pawns
  // To check if sq is attacked by black pawn, look at sq+15 and sq+17 for black pawns
  if (attackerColor === COLORS.WHITE) {
    const pawnAttacks = [-15, -17];
    for (const offset of pawnAttacks) {
      const attackerSq = sq + offset;
      if ((attackerSq & 0x88) === 0 && board[attackerSq] === WP) return true;
    }
  } else {
    const pawnAttacks = [15, 17];
    for (const offset of pawnAttacks) {
      const attackerSq = sq + offset;
      if ((attackerSq & 0x88) === 0 && board[attackerSq] === BP) return true;
    }
  }

  // Knight attacks
  for (const offset of KNIGHT_OFFSETS) {
    const attackerSq = sq + offset;
    if ((attackerSq & 0x88) === 0) {
      const piece = board[attackerSq];
      if ((attackerColor === COLORS.WHITE && piece === WN) || (attackerColor === COLORS.BLACK && piece === BN)) return true;
    }
  }

  // King attacks
  for (const offset of KING_OFFSETS) {
    const attackerSq = sq + offset;
    if ((attackerSq & 0x88) === 0) {
      const piece = board[attackerSq];
      if ((attackerColor === COLORS.WHITE && piece === WK) || (attackerColor === COLORS.BLACK && piece === BK)) return true;
    }
  }

   // Sliding attacks
  for (const dir of QUEEN_DIRS) {
    let t = sq + dir;
    while ((t & 0x88) === 0) {
      const piece = board[t];
      if (piece !== 0) {
        const colorMatches = getPieceColor(piece) === attackerColor;
        if (colorMatches && ((isBishop(piece) && BISHOP_DIRS.includes(dir)) || (isRook(piece) && ROOK_DIRS.includes(dir)) || isQueen(piece))) {
          return true;
        }
        break;
      }
      t += dir;
    }
  }

  return false;
}

// Generate pseudo-legal moves for a piece
function generatePieceMoves(board, sq, color) {
  const moves = [];
  const piece = board[sq];
  if (piece === 0) return moves;
  const white = isWhitePiece(piece);

  if (isPawn(piece)) {
    const dir = white ? 16 : -16;
    const startRank = white ? 1 : 6;
    const promoRank = white ? 7 : 0;
    const one = sq + dir;
    const two = sq + dir * 2;

    if ((one & 0x88) === 0 && board[one] === 0) {
      if ((one >> 4) === promoRank) {
        moves.push(new Move(sq, one, 2, FLAGS.PROMOTION));
        moves.push(new Move(sq, one, 3, FLAGS.PROMOTION));
        moves.push(new Move(sq, one, 4, FLAGS.PROMOTION));
        moves.push(new Move(sq, one, 5, FLAGS.PROMOTION));
      } else {
        moves.push(new Move(sq, one));
        if ((sq >> 4) === startRank && (two & 0x88) === 0 && board[two] === 0) {
          moves.push(new Move(sq, two));
        }
      }
    }

    // Captures (forward-diagonal)
    const capOffsets = white ? [15, 17] : [-15, -17];
    for (const offset of capOffsets) {
      const target = sq + offset;
      if ((target & 0x88) === 0) {
        const tp = board[target];
        if (tp !== 0 && getPieceColor(tp) !== color) {
          const move = new Move(sq, target, 0, FLAGS.CAPTURE);
          move.captured = tp;
          if ((target >> 4) === promoRank) {
            move.flags |= FLAGS.PROMOTION;
            moves.push(new Move(sq, target, 2, FLAGS.CAPTURE | FLAGS.PROMOTION));
            moves.push(new Move(sq, target, 3, FLAGS.CAPTURE | FLAGS.PROMOTION));
            moves.push(new Move(sq, target, 4, FLAGS.CAPTURE | FLAGS.PROMOTION));
            moves.push(new Move(sq, target, 5, FLAGS.CAPTURE | FLAGS.PROMOTION));
          } else {
            moves.push(move);
          }
        }
      }
    }
  } else if (isKnight(piece)) {
    for (const offset of KNIGHT_OFFSETS) {
      const target = sq + offset;
      if ((target & 0x88) === 0) {
        const tp = board[target];
        if (tp === 0) moves.push(new Move(sq, target));
        else if (getPieceColor(tp) !== color) {
          const m = new Move(sq, target, 0, FLAGS.CAPTURE);
          m.captured = tp;
          moves.push(m);
        }
      }
    }
  } else if (isKing(piece)) {
    for (const offset of KING_OFFSETS) {
      const target = sq + offset;
      if ((target & 0x88) === 0) {
        const tp = board[target];
        if (tp === 0) moves.push(new Move(sq, target));
        else if (getPieceColor(tp) !== color) {
          const m = new Move(sq, target, 0, FLAGS.CAPTURE);
          m.captured = tp;
          moves.push(m);
        }
      }
    }
  } else {
    // Sliding: bishop, rook, queen
    let dirs;
    if (isBishop(piece)) dirs = BISHOP_DIRS;
    else if (isRook(piece)) dirs = ROOK_DIRS;
    else dirs = QUEEN_DIRS;

    for (const dir of dirs) {
      let target = sq + dir;
      while ((target & 0x88) === 0) {
        const tp = board[target];
        if (tp === 0) moves.push(new Move(sq, target));
        else {
          if (getPieceColor(tp) !== color) {
            const m = new Move(sq, target, 0, FLAGS.CAPTURE);
            m.captured = tp;
            moves.push(m);
          }
          break;
        }
        target += dir;
      }
    }
  }

  return moves;
}

// Add castling and en passant moves
function addSpecialMoves(moves, board, color, castlingRights, epSquare) {
  const extra = [];

  if (color === COLORS.WHITE) {
    // Kingside: e1->g1, rook h1->f1
    if ((castlingRights & CASTLING.WHITE_KINGSIDE) &&
        board[5] === 0 && board[6] === 0 && board[7] === WR && board[4] === WK &&
        !isSquareAttacked(board, 4, COLORS.BLACK) &&
        !isSquareAttacked(board, 5, COLORS.BLACK) &&
        !isSquareAttacked(board, 6, COLORS.BLACK)) {
      extra.push(new Move(4, 6, 0, FLAGS.CASTLING));
    }
    // Queenside: e1->c1, rook a1->d1, b1 must be empty
    if ((castlingRights & CASTLING.WHITE_QUEENSIDE) &&
        board[1] === 0 && board[2] === 0 && board[3] === 0 && board[0] === WR && board[4] === WK &&
        !isSquareAttacked(board, 4, COLORS.BLACK) &&
        !isSquareAttacked(board, 3, COLORS.BLACK) &&
        !isSquareAttacked(board, 2, COLORS.BLACK)) {
      extra.push(new Move(4, 2, 0, FLAGS.CASTLING));
    }
    // En passant for white: ep square on rank 5 (0x88 rank 5), pawn on rank 4 (0x40+file)
    if (epSquare !== INVALID && (epSquare >> 4) === 5) {
      const epFile = epSquare & 0x07;
      for (const f of [epFile - 1, epFile + 1]) {
        if (f >= 0 && f < 8) {
          const pawnSq = 0x40 + f;
          if (board[pawnSq] === WP) {
            const m = new Move(pawnSq, epSquare, 0, FLAGS.CAPTURE | FLAGS.EN_PASSANT);
            m.captured = BP;
            extra.push(m);
          }
        }
      }
    }
  } else {
    // Black kingside: e8->g8, rook h8->f8
    if ((castlingRights & CASTLING.BLACK_KINGSIDE) &&
        board[117] === 0 && board[118] === 0 && board[119] === BR && board[116] === BK &&
        !isSquareAttacked(board, 116, COLORS.WHITE) &&
        !isSquareAttacked(board, 117, COLORS.WHITE) &&
        !isSquareAttacked(board, 118, COLORS.WHITE)) {
      extra.push(new Move(116, 118, 0, FLAGS.CASTLING));
    }
    // Black queenside: e8->c8, rook a8->d8, b8 must be empty
    if ((castlingRights & CASTLING.BLACK_QUEENSIDE) &&
        board[113] === 0 && board[114] === 0 && board[115] === 0 && board[112] === BR && board[116] === BK &&
        !isSquareAttacked(board, 116, COLORS.WHITE) &&
        !isSquareAttacked(board, 115, COLORS.WHITE) &&
        !isSquareAttacked(board, 114, COLORS.WHITE)) {
      extra.push(new Move(116, 114, 0, FLAGS.CASTLING));
    }
    // En passant for black: ep square on rank 2 (0x88 rank 2), pawn on rank 3 (0x30+file)
    if (epSquare !== INVALID && (epSquare >> 4) === 2) {
      const epFile = epSquare & 0x07;
      for (const f of [epFile - 1, epFile + 1]) {
        if (f >= 0 && f < 8) {
          const pawnSq = 0x30 + f;
          if (board[pawnSq] === BP) {
            const m = new Move(pawnSq, epSquare, 0, FLAGS.CAPTURE | FLAGS.EN_PASSANT);
            m.captured = WP;
            extra.push(m);
          }
        }
      }
    }
  }

  return [...moves, ...extra];
}

// Generate all pseudo-legal moves (no legality filtering)
function generatePseudoLegalMoves(board, color) {
  const moves = [];
  for (let sq = 0; sq < 128; sq++) {
    if ((sq & 0x88) !== 0) continue;
    const piece = board[sq];
    if (piece !== 0 && getPieceColor(piece) === color) {
      moves.push(...generatePieceMoves(board, sq, color));
    }
  }
  return moves;
}

// Apply a move to a state, return new state
function makeMove(state, move) {
  const board = new Uint8Array(state.board);
  const piece = board[move.from];
  const captured = board[move.to];

  const newState = {
    board,
    sideToMove: state.sideToMove === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE,
    castlingRights: state.castlingRights,
    enPassantSquare: INVALID,
    halfmoveClock: state.halfmoveClock,
    fullmoveNumber: state.fullmoveNumber,
    prevState: state
  };

  // Clear source
  board[move.from] = 0;
  board[move.to] = piece;

  // Promotion
  if (move.isPromotion && move.promotion) {
    board[move.to] = isWhitePiece(piece) ? move.promotion : move.promotion + 8;
  }

  // En passant capture
  if (move.isEnPassant) {
    const capSq = isWhitePiece(piece) ? move.to - 16 : move.to + 16;
    board[capSq] = 0;
    move.captured = isWhitePiece(piece) ? BP : WP;
  }

  // Castling - move rook
  if (move.isCastling) {
    if (move.to === 6) {      // g1
      board[5] = board[7];    // f1 = h1 rook
      board[7] = 0;
    } else if (move.to === 2) {  // c1
      board[3] = board[0];    // d1 = a1 rook
      board[0] = 0;
    } else if (move.to === 118) { // g8
      board[117] = board[119]; // f8 = h8 rook
      board[119] = 0;
    } else if (move.to === 114) { // c8
      board[115] = board[112]; // d8 = a8 rook
      board[112] = 0;
    }
  }

  // Update castling rights
  let cr = state.castlingRights;
  if (piece === WK) cr &= ~(CASTLING.WHITE_KINGSIDE | CASTLING.WHITE_QUEENSIDE);
  if (piece === BK) cr &= ~(CASTLING.BLACK_KINGSIDE | CASTLING.BLACK_QUEENSIDE);
  if (move.from === 7) cr &= ~CASTLING.WHITE_KINGSIDE;   // h1
  if (move.from === 0) cr &= ~CASTLING.WHITE_QUEENSIDE;  // a1
  if (move.from === 119) cr &= ~CASTLING.BLACK_KINGSIDE;   // h8
  if (move.from === 112) cr &= ~CASTLING.BLACK_QUEENSIDE; // a8
  newState.castlingRights = cr;

  // En passant target square
  if (isPawn(piece) && Math.abs(move.to - move.from) === 32) {
    newState.enPassantSquare = isWhitePiece(piece) ? move.to - 16 : move.to + 16;
  }

  // Halfmove clock
  if (isPawn(piece) || move.isCapture || move.isEnPassant) {
    newState.halfmoveClock = 0;
  } else {
    newState.halfmoveClock = state.halfmoveClock + 1;
  }

  // Fullmove number
  if (state.sideToMove === COLORS.BLACK) {
    newState.fullmoveNumber = state.fullmoveNumber + 1;
  }

  return newState;
}

// Generate all legal moves for a state
function generateLegalMoves(state) {
  const pseudo = generatePseudoLegalMoves(state.board, state.sideToMove);
  const allMoves = addSpecialMoves(pseudo, state.board, state.sideToMove, state.castlingRights, state.enPassantSquare);
  const legal = [];
  const kingSq = findKing(state.board, state.sideToMove);

  for (const move of allMoves) {
    const newState = makeMove(state, move);

    let newKingSq;
    if (isKing(move.to) && !move.isCastling) {
      newKingSq = move.to;
    } else if (move.from === kingSq) {
      newKingSq = move.to;
    } else {
      newKingSq = kingSq;
    }

    if (!isSquareAttacked(newState.board, newKingSq, newState.sideToMove)) {
      legal.push(move);
    }
  }

  return legal;
}

// Evaluation function (static position evaluation)
function evaluatePosition(board, sideToMove) {
  let score = 0;
  for (let sq = 0; sq < 128; sq++) {
    if ((sq & 0x88) !== 0) continue;
    const piece = board[sq];
    if (piece === 0) continue;
    const val = PIECE_VALUES[piece] || 0;
    if (isWhitePiece(piece)) score += val;
    else score -= val;
  }
  return score;
}

// Simple minimax for AI
function searchBestMove(state, depth, alpha = -Infinity, beta = Infinity, maximizing = true) {
  if (depth === 0) {
    return { score: evaluatePosition(state.board, state.sideToMove), move: null };
  }

  const moves = generateLegalMoves(state);
  if (moves.length === 0) {
    const inCheck = isSquareAttacked(state.board, findKing(state.board, state.sideToMove),
      state.sideToMove === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE);
    return { score: inCheck ? (maximizing ? -99999 : 99999) : 0, move: null };
  }

  let bestMove = null;

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newState = makeMove(state, move);
      const result = searchBestMove(newState, depth - 1, alpha, beta, false);
      if (result.score > maxEval) {
        maxEval = result.score;
        bestMove = move;
      }
      alpha = Math.max(alpha, result.score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newState = makeMove(state, move);
      const result = searchBestMove(newState, depth - 1, alpha, beta, true);
      if (result.score < minEval) {
        minEval = result.score;
        bestMove = move;
      }
      beta = Math.min(beta, result.score);
      if (beta <= alpha) break;
    }
    return { score: minEval, move: bestMove };
  }
}

// Main ChessEngine class
export class ChessEngine {
  constructor(fen = STARTING_FEN) {
    this._initialFEN = fen;
    this._state = parseFEN(fen);
    this._moveHistory = [];
    this._positionHistory = new Map();
    this._updatePositionHistory();
  }

  _updatePositionHistory() {
    const key = this.getFEN();
    this._positionHistory.set(key, (this._positionHistory.get(key) || 0) + 1);
  }

  _rebuildPositionHistory() {
    this._positionHistory = new Map();
    const initialState = parseFEN(this._initialFEN);
    let current = initialState;
    const initialFen = generateFEN(current.board, current.sideToMove, current.castlingRights, current.enPassantSquare, current.halfmoveClock, current.fullmoveNumber);
    this._positionHistory.set(initialFen, 1);
    for (const move of this._moveHistory) {
      current = makeMove(current, move);
      const fen = generateFEN(current.board, current.sideToMove, current.castlingRights, current.enPassantSquare, current.halfmoveClock, current.fullmoveNumber);
      this._positionHistory.set(fen, (this._positionHistory.get(fen) || 0) + 1);
    }
    this._state = current;
  }

  get board() { return this._state.board; }
  get turn() { return this._state.sideToMove; }

  static fromFEN(fen) { return new ChessEngine(fen); }

  loadFEN(fen) {
    this._state = parseFEN(fen);
    this._moveHistory = [];
    this._positionHistory = new Map();
    this._updatePositionHistory();
  }

  getFEN() {
    return generateFEN(
      this._state.board,
      this._state.sideToMove,
      this._state.castlingRights,
      this._state.enPassantSquare,
      this._state.halfmoveClock,
      this._state.fullmoveNumber
    );
  }

  getPGN() {
    let pgn = '[Event "Casual Game"]\n';
    pgn += '[Site "?"]\n';
    pgn += '[Date "' + new Date().toISOString().split('T')[0].replace(/-/g, '.') + '"]\n';
    pgn += '[Round "?"]\n';
    pgn += '[White "?"]\n';
    pgn += '[Black "?"]\n';
    pgn += '[Result "*"]\n\n';

    let text = '';
    const tempBoard = this._cloneState(this._state);
    // Reset to starting position to replay
    const replay = new ChessEngine(STARTING_FEN);
    
    for (let i = 0; i < this._moveHistory.length; i++) {
      if (i % 2 === 0) text += `${Math.floor(i / 2) + 1}. `;
      const san = this._computeSAN(this._moveHistory[i], replay._state);
      text += san + ' ';
      replay.makeMove(this._moveHistory[i]);
    }
    text += '*';
    pgn += text.trim();
    return pgn;
  }

  _computeSAN(move, state) {
    const piece = state.board[move.from];
    const targetAlg = squareToAlgebraic(move.to);
    const fromAlg = squareToAlgebraic(move.from);
    let san = '';

    if (isPawn(piece)) {
      if (move.isCapture || move.isEnPassant) {
        san = fromAlg[0] + 'x' + targetAlg;
      } else {
        san = targetAlg;
      }
      if (move.isPromotion) {
        const promoMap = { 2:'N', 3:'B', 4:'R', 5:'Q' };
        san += '=' + (promoMap[move.promotion] || 'Q');
      }
    } else {
      const pieceMap = { 2:'N', 3:'B', 4:'R', 5:'Q', 6:'K' };
      const whitePiece = isWhitePiece(piece);
      const pt = whitePiece ? pieceToSymbol(piece) : pieceToSymbol(piece).toUpperCase();
      san = pt;

      // Disambiguation
      const sameTypeMoves = state.sideToMove === COLORS.WHITE
        ? generatePseudoLegalMoves(state.board, COLORS.WHITE)
          .filter(m => m.from !== move.from && m.to === move.to && state.board[m.from] === piece)
        : generatePseudoLegalMoves(state.board, COLORS.BLACK)
          .filter(m => m.from !== move.from && m.to === move.to && state.board[m.from] === piece);
      
      // Actually we need all pseudo-legal moves for same piece type
      const allPseudo = generatePseudoLegalMoves(state.board, state.sideToMove)
        .filter(m => m.from !== move.from && m.to === move.to && state.board[m.from] === piece);
      
      if (allPseudo.length > 0) {
        const sameFile = allPseudo.some(m => squareToAlgebraic(m.from)[0] === fromAlg[0]);
        if (!sameFile) {
          san += fromAlg[0];
        } else {
          san += fromAlg;
        }
      }

      if (move.isCapture) san += 'x';
      san += targetAlg;
    }

    // Check for check/mate
    const newState = makeMove(state, move);
    const kingSq = isKing(newState.board[move.to]) ? move.to : 
                    (move.from === findKing(state.board, state.sideToMove) ? move.to : findKing(newState.board, state.sideToMove === COLORS.WHITE ? COLORS.WHITE : COLORS.WHITE));
    const oppColor = newState.sideToMove === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    const inCheck = isSquareAttacked(newState.board, findKing(newState.board, newState.sideToMove), oppColor);
    const oppMoves = generateLegalMoves(newState);
    
    if (oppMoves.length === 0) {
      if (inCheck) san += '#';
    } else if (inCheck) {
      san += '+';
    }

    return san;
  }

  _cloneState(state) {
    return {
      board: new Uint8Array(state.board),
      sideToMove: state.sideToMove,
      castlingRights: state.castlingRights,
      enPassantSquare: state.enPassantSquare,
      halfmoveClock: state.halfmoveClock,
      fullmoveNumber: state.fullmoveNumber
    };
  }

  makeMove(move) {
    this._state = makeMove(this._state, move);
    this._moveHistory.push(move);
    this._updatePositionHistory();
  }

  undoMove() {
    if (this._moveHistory.length === 0) return null;
    const move = this._moveHistory.pop();
    // Use the previous state stored by makeMove
    if (this._state.prevState) {
      this._state = this._state.prevState;
    } else {
      // Reconstruct state by replaying all moves from the initial position
      const newState = parseFEN(this._initialFEN || STARTING_FEN);
      for (let i = 0; i < this._moveHistory.length; i++) {
        const result = makeMove(newState, this._moveHistory[i]);
        Object.assign(newState, result);
      }
      this._state = newState;
    }
    this._rebuildPositionHistory();
    return move;
  }

  generateMoves() {
    return generateLegalMoves(this._state);
  }

  generatePseudoLegalMoves() {
    const pseudo = generatePseudoLegalMoves(this._state.board);
    return addSpecialMoves(pseudo, this._state.board, this._state.sideToMove, this._state.castlingRights, this._state.enPassantSquare);
  }

  isLegalMove(move) {
    const moves = this.generateMoves();
    return moves.some(m => m.from === move.from && m.to === move.to && m.promotion === move.promotion);
  }

  isInCheck() {
    const { board, sideToMove } = this._state;
    const kingSq = findKing(board, sideToMove);
    const oppColor = sideToMove === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE;
    return isSquareAttacked(board, kingSq, oppColor);
  }

  isCheckmate() {
    return this.generateMoves().length === 0 && this.isInCheck();
  }

  isStalemate() {
    return this.generateMoves().length === 0 && !this.isInCheck();
  }

  isDraw() {
    return this.isStalemate() || this.isInsufficientMaterial() || this.isFiftyMoveRule() || this.isThreefoldRepetition();
  }

  canClaimDraw() {
    return this.isFiftyMoveRule() || this.isThreefoldRepetition();
  }

  isInsufficientMaterial() {
    const pieces = {};
    let count = 0;
    for (let sq = 0; sq < 128; sq++) {
      if ((sq & 0x88) !== 0) continue;
      const p = this._state.board[sq];
      if (p !== 0) {
        count++;
        pieces[p] = (pieces[p] || 0) + 1;
      }
    }

    if (count === 2) return true; // K vs K

    if (count === 3) {
      const minorPieces = (pieces[WN] || 0) + (pieces[BN] || 0) + (pieces[WB] || 0) + (pieces[BB] || 0);
      if (minorPieces === 1) return true;
    }

    return false;
  }

  isFiftyMoveRule() {
    return this._state.halfmoveClock >= 100;
  }

  isThreefoldRepetition() {
    const fen = this.getFEN();
    return (this._positionHistory.get(fen) || 0) >= 3;
  }

  getGameResult() {
    const result = this.getGameResultDetailed();
    return result;
  }

  getGameResultDetailed() {
    if (this.isCheckmate()) {
      return { winner: this._state.sideToMove === COLORS.WHITE ? COLORS.BLACK : COLORS.WHITE, reason: 'checkmate' };
    }
    if (this.isStalemate()) {
      return { winner: null, reason: 'stalemate' };
    }
    if (this.isFiftyMoveRule()) {
      return { winner: null, reason: 'fifty-move' };
    }
    if (this.isThreefoldRepetition()) {
      return { winner: null, reason: 'threefold-repetition' };
    }
    if (this.isInsufficientMaterial()) {
      return { winner: null, reason: 'insufficient-material' };
    }
    return null;
  }

  getBoard() {
    const result = [];
    for (let rank = 7; rank >= 0; rank--) {
      const row = [];
      for (let file = 0; file < 8; file++) {
        row.push(this._state.board[rank * 16 + file]);
      }
      result.push(row);
    }
    return result;
  }

  getHistory() {
    return this._moveHistory.map(m => m.clone());
  }

  getTurn() {
    return this._state.sideToMove;
  }

  getCastlingRights() {
    return this._state.castlingRights;
  }

  getEnPassantSquare() {
    return this._state.enPassantSquare;
  }

  getHalfmoveClock() {
    return this._state.halfmoveClock;
  }

  getFullmoveNumber() {
    return this._state.fullmoveNumber;
  }

  clone() {
    const cloned = new ChessEngine(this.getFEN());
    cloned._initialFEN = this._initialFEN;
    cloned._moveHistory = this._moveHistory.map(m => m.clone());
    cloned._positionHistory = new Map(this._positionHistory);
    return cloned;
  }

  // AI methods
  evaluate() {
    return evaluatePosition(this._state.board, this._state.sideToMove);
  }

  setDifficulty(level) {
    this._aiDepth = level;
  }

  getBestMove(difficulty = 2) {
    const depth = typeof difficulty === 'string'
      ? { easy: 1, medium: 3, hard: 5 }[difficulty] || 2
      : difficulty;
    const result = searchBestMove(this._state, depth, -Infinity, Infinity, this._state.sideToMove === COLORS.WHITE);
    return result.move;
  }

  moveToSAN(move) {
    return this._computeSAN(move, this._state);
  }

  moveFromSAN(san) {
    san = san.replace(/[+#]/g, '');
    const moves = this.generateMoves();
    for (const move of moves) {
      const expectedSAN = this._computeSAN(move, this._state);
      if (expectedSAN.replace(/[+#]/g, '') === san) return move;
    }
    return null;
  }

  reset() {
    this.loadFEN(STARTING_FEN);
  }

  // Utility
  squareToAlgebraic(sq) { return squareToAlgebraic(sq); }
  algebraicToSquare(alg) { return algebraicToSquare(alg); }

  static sqToAlg(sq) { return squareToAlgebraic(sq); }
  static algToSq(alg) { return algebraicToSquare(alg); }
}

export {
  Move,
  FLAGS,
  CASTLING,
  pieceToUnicode,
  pieceToSymbol,
  parseFEN,
  generateFEN,
  findKing,
  isSquareAttacked,
  generatePseudoLegalMoves,
  generateLegalMoves,
  makeMove,
  evaluatePosition,
  isWhitePiece,
  isBlackPiece,
  isPawn,
  isKnight,
  isBishop,
  isRook,
  isQueen,
  isKing,
  squareToAlgebraic,
  algebraicToSquare
};

export default ChessEngine;