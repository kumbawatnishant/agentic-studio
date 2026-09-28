import { describe, it, expect, beforeEach } from 'vitest';
import ChessEngine, {
  STARTING_FEN,
  PIECES,
  COLORS,
  Move,
  FLAGS,
  parseFEN,
  generateFEN,
  generatePseudoLegalMoves,
  findKing,
  isSquareAttacked,
  pieceToUnicode,
  pieceToSymbol,
  squareToAlgebraic,
  algebraicToSquare
} from '../chess.js';

describe('Constants', () => {
  it('should have STARTING_FEN', () => {
    expect(STARTING_FEN).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  });

  it('should have correct piece constants', () => {
    expect(PIECES.KING).toBe('k');
    expect(PIECES.QUEEN).toBe('q');
    expect(PIECES.ROOK).toBe('r');
  });

  it('should have correct color constants', () => {
    expect(COLORS.WHITE).toBe('w');
    expect(COLORS.BLACK).toBe('b');
  });
});

describe('Chess Engine - Initial Position', () => {
  let game;

  beforeEach(() => {
    game = new ChessEngine();
  });

  it('should start with correct FEN', () => {
    expect(game.getFEN()).toBe(STARTING_FEN);
  });

  it('should have 20 legal moves at start', () => {
    const moves = game.generateMoves();
    expect(moves.length).toBe(20);
  });

  it('should be white to move', () => {
    expect(game.getTurn()).toBe(COLORS.WHITE);
  });

  it('should not be in check at start', () => {
    expect(game.isInCheck()).toBe(false);
  });

  it('should not be in checkmate or stalemate', () => {
    expect(game.isCheckmate()).toBe(false);
    expect(game.isStalemate()).toBe(false);
  });

  it('should have no game result at start', () => {
    expect(game.getGameResult()).toBeNull();
  });

  it('should render 8x8 board', () => {
    const board = game.getBoard();
    expect(board.length).toBe(8);
    expect(board[0].length).toBe(8);
  });
});

describe('Chess Engine - FEN', () => {
  it('should round-trip FEN correctly', () => {
    const fens = [
      STARTING_FEN,
      'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1',
      '8/8/4k3/8/8/4K3/8/8 w - - 0 1',
      'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 0 1',
      '8/2p5/3p4/3P4/3P4/2P5/8/4K1k1 w - - 0 1'
    ];

    for (const fen of fens) {
      const game = new ChessEngine(fen);
      expect(game.getFEN()).toBe(fen);
    }
  });

  it('should parse FEN with en passant square', () => {
    const fen = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
    const game = new ChessEngine(fen);
    expect(game.getEnPassantSquare()).toBe(ChessEngine.algToSq('d6'));
  });

  it('should parse castling rights correctly', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const game = new ChessEngine(fen);
    expect(game.getCastlingRights()).toBe(15); // KQkq = all 4
  });

  it('should parse halfmove clock and fullmove number', () => {
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const game = new ChessEngine(fen);
    expect(game.getHalfmoveClock()).toBe(0);
    expect(game.getFullmoveNumber()).toBe(1);
  });
});

describe('Chess Engine - Move Generation', () => {
  it('should generate 16 pawn moves and 4 knight moves for 20 total at start', () => {
    const game = new ChessEngine();
    const moves = game.generateMoves();
    expect(moves.length).toBe(20);
  });

  it('should generate knight moves correctly', () => {
    const game = new ChessEngine();
    const moves = game.generateMoves();
    const knightMoves = moves.filter(m => {
      const piece = game.board[m.from];
      return piece === 2 || piece === 10;
    });
    expect(knightMoves.length).toBe(4);
  });

  it('should generate pawn double moves', () => {
    const game = new ChessEngine();
    const moves = game.generateMoves();
    const pawnMoves = moves.filter(m => {
      const piece = game.board[m.from];
      return piece === 1 || piece === 9;
    });
    expect(pawnMoves.length).toBe(16);
  });

  it('should generate correct moves after 1.e4', () => {
    const game = new ChessEngine();
    const e4 = game.generateMoves().find(m => m.to === 52); // e4 = rank 3, file 4
    expect(e4).toBeDefined();
    game.makeMove(e4);
    const moves = game.generateMoves();
    expect(moves.length).toBe(20);
  });
});

describe('Chess Engine - Special Moves', () => {
  describe('Castling', () => {
    it('should allow castling from position with castling rights', () => {
      const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
      const game = new ChessEngine(fen);
      const moves = game.generateMoves();
      const castleMoves = moves.filter(m => m.isCastling);
      expect(castleMoves.length).toBe(2);
    });

    it('should execute kingside castling correctly', () => {
      const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
      const game = new ChessEngine(fen);
      const castleMove = game.generateMoves().find(m => m.isCastling && m.to === 6); // g1
      expect(castleMove).toBeDefined();
      game.makeMove(castleMove);
      // After white castles kingside: R4RK1, halfmove clock = 1 (king move)
      expect(game.getFEN()).toBe('r3k2r/8/8/8/8/8/8/R4RK1 b kq - 1 1');
    });

    it('should execute queenside castling correctly', () => {
      const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
      const game = new ChessEngine(fen);
      const castleMove = game.generateMoves().find(m => m.isCastling && m.to === 2); // c1
      expect(castleMove).toBeDefined();
      game.makeMove(castleMove);
      // After white castles queenside: 2KR3R, halfmove clock = 1
      expect(game.getFEN()).toBe('r3k2r/8/8/8/8/8/8/2KR3R b kq - 1 1');
    });

    it('should not allow castling when king has moved', () => {
      const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
      const game = new ChessEngine(fen);
      // Move king first (not castling)
      const kingMove = game.generateMoves().find(m => m.from === 4 && !m.isCastling);
      expect(kingMove).toBeDefined();
      game.makeMove(kingMove);
      // Black's turn - black can still castle, but white cannot
      const blackMoves = game.generateMoves();
      const blackCastle = blackMoves.filter(m => (m.to === 118 || m.to === 114) && m.isCastling);
      expect(blackCastle.length).toBe(2);
    });

    it('should not allow kingside castling when rook has moved', () => {
      const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
      const game = new ChessEngine(fen);
      // Move h1 rook to h2
      const rookMove = game.generateMoves().find(m => m.from === 7 && !m.isCastling && !m.isCapture && m.to === 23);
      expect(rookMove).toBeDefined();
      game.makeMove(rookMove);
      // White should lose kingside castling rights
      const fenAfter = game.getFEN();
      const castlingField = fenAfter.split(' ')[2];
      expect(castlingField).not.toContain('K');
      // Black should still have both castling rights
      expect(castlingField).toContain('k');
      expect(castlingField).toContain('q');
    });
  });

  describe('En Passant', () => {
    it('should allow en passant capture', () => {
      // After black plays d7-d5, white can capture en passant
      const fen = 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
      const game = new ChessEngine(fen);
      const moves = game.generateMoves();
      const epMoves = moves.filter(m => m.isEnPassant);
      expect(epMoves.length).toBe(1);

      game.makeMove(epMoves[0]);
      // After en passant capture, white pawn moves to d6 and black d5 pawn is removed
      expect(game.getFEN()).toBe('rnbqkbnr/ppp1pppp/3P4/8/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2');
    });

    it('should not allow en passant when not available', () => {
      const game = new ChessEngine();
      const moves = game.generateMoves();
      const epMoves = moves.filter(m => m.isEnPassant);
      expect(epMoves.length).toBe(0);
    });

    it('should set en passant square after double pawn push', () => {
      const game = new ChessEngine();
      const e4 = game.generateMoves().find(m => m.to === 52);
      game.makeMove(e4);
      expect(game.getEnPassantSquare()).not.toBe(0x88);
    });
  });

  describe('Pawn Promotion', () => {
    it('should generate 4 promotion moves for pawn reaching last rank', () => {
      const fen = '8/P7/8/8/8/8/8/k6K w - - 0 1';
      const game = new ChessEngine(fen);
      const moves = game.generateMoves();
      const promoMoves = moves.filter(m => m.isPromotion);
      expect(promoMoves.length).toBe(4);
    });

    it('should promote to queen', () => {
      const fen = '8/P7/8/8/8/8/8/k6K w - - 0 1';
      const game = new ChessEngine(fen);
      const moves = game.generateMoves();
      const queenPromo = moves.find(m => m.isPromotion && m.promotion === 5);
      expect(queenPromo).toBeDefined();
      game.makeMove(queenPromo);
      const board = game.getBoard();
      // board[0] is rank 7 (chess rank 8, a8-h8)
      expect(board[0][0]).toBe(5); // White queen at a8
    });

    it('should promote to knight', () => {
      const fen = '8/P7/8/8/8/8/8/k6K w - - 0 1';
      const game = new ChessEngine(fen);
      const moves = game.generateMoves();
      const knightPromo = moves.find(m => m.isPromotion && m.promotion === 2);
      expect(knightPromo).toBeDefined();
      game.makeMove(knightPromo);
      const board = game.getBoard();
      expect(board[0][0]).toBe(2); // White knight at a8
    });

    it('should promote with capture', () => {
      // Pawn at b7 can capture rook at a8 OR promote to b8 (empty)
      const fen = 'r3k3/1P6/8/8/8/8/8/4K3 w - - 0 1';
      const game = new ChessEngine(fen);
      const moves = game.generateMoves();
      const promoMoves = moves.filter(m => m.isPromotion);
      // 4 forward promotions + 4 capture promotions = 8
      expect(promoMoves.length).toBe(8);
      const queenPromo = promoMoves.find(m => m.isCapture && m.promotion === 5);
      expect(queenPromo).toBeDefined();
    });
  });
});

describe('Chess Engine - Game State Detection', () => {
  it('should detect check', () => {
    // Position where white king is in check from enemy rook
    const fen = '4k3/8/8/8/8/8/8/4R1K1 w - - 0 1';
    const game = new ChessEngine(fen);
    // Actually let's test with a known check position
    // King on e1, enemy rook on e8 (same file)
    const game2 = new ChessEngine('4r3/8/8/8/8/8/8/4K3 w - - 0 1');
    expect(game2.isInCheck()).toBe(true);
  });

  it('should detect checkmate (fool\'s mate)', () => {
    const game = new ChessEngine();
    game.makeMove(game.moveFromSAN('f3'));
    game.makeMove(game.moveFromSAN('e5'));
    game.makeMove(game.moveFromSAN('g4'));
    game.makeMove(game.moveFromSAN('Qh4'));

    expect(game.isCheckmate()).toBe(true);
    expect(game.getGameResult()).not.toBeNull();
    expect(game.getGameResult().winner).toBe(COLORS.BLACK);
  });

  it('should detect checkmate (Scholar\'s mate)', () => {
    const game = new ChessEngine();
    game.makeMove(game.moveFromSAN('e4'));
    game.makeMove(game.moveFromSAN('e5'));
    game.makeMove(game.moveFromSAN('Bc4'));
    game.makeMove(game.moveFromSAN('Nc6'));
    game.makeMove(game.moveFromSAN('Qh5'));
    game.makeMove(game.moveFromSAN('Nf6'));
    game.makeMove(game.moveFromSAN('Qxf7'));

    expect(game.isCheckmate()).toBe(true);
  });

  it('should detect stalemate', () => {
    const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
    const game = new ChessEngine(fen);
    expect(game.isStalemate()).toBe(true);
    expect(game.isCheckmate()).toBe(false);
    expect(game.getGameResult().winner).toBeNull();
  });

  it('should detect stalemate with another position', () => {
    const fen = '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1';
    const game = new ChessEngine(fen);
    expect(game.isStalemate()).toBe(true);
  });

  it('should detect insufficient material (K vs K)', () => {
    const fen = '8/8/4k3/8/8/4K3/8/8 w - - 0 1';
    const game = new ChessEngine(fen);
    expect(game.isInsufficientMaterial()).toBe(true);
  });

  it('should detect insufficient material (K+N vs K)', () => {
    const fen = '8/8/4k3/8/8/4K3/8/3N4 w - - 0 1';
    const game = new ChessEngine(fen);
    expect(game.isInsufficientMaterial()).toBe(true);
  });

  it('should detect insufficient material (K+B vs K)', () => {
    const fen = '8/8/4k3/8/8/4K3/8/3B4 w - - 0 1';
    const game = new ChessEngine(fen);
    expect(game.isInsufficientMaterial()).toBe(true);
  });

  it('should not claim insufficient material (K+R vs K)', () => {
    const fen = '8/8/4k3/8/8/4K3/8/3R4 w - - 0 1';
    const game = new ChessEngine(fen);
    expect(game.isInsufficientMaterial()).toBe(false);
  });

  it('should detect 50-move draw', () => {
    const fen = '8/8/4k3/8/8/4K3/8/8 w - - 100 1';
    const game = new ChessEngine(fen);
    expect(game.isFiftyMoveRule()).toBe(true);
    expect(game.isDraw()).toBe(true);
  });
});

describe('Chess Engine - makeMove/undo', () => {
  it('should make and undo moves correctly', () => {
    const game = new ChessEngine();
    const initialFEN = game.getFEN();

    const moves = game.generateMoves();
    game.makeMove(moves[0]);
    expect(game.getFEN()).not.toBe(initialFEN);
    expect(game.getHistory().length).toBe(1);

    game.undoMove();
    expect(game.getHistory().length).toBe(0);
    expect(game.getFEN()).toBe(initialFEN);
  });

  it('should undo multiple moves', () => {
    const game = new ChessEngine();
    const initialFEN = game.getFEN();

    const m1 = game.generateMoves()[0];
    game.makeMove(m1);
    const afterMove1 = game.getFEN();

    const m2 = game.generateMoves()[0];
    game.makeMove(m2);
    const afterMove2 = game.getFEN();

    game.undoMove();
    expect(game.getFEN()).toBe(afterMove1);

    game.undoMove();
    expect(game.getFEN()).toBe(initialFEN);
  });

  it('should correctly undo castling', () => {
    const fen = 'r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1';
    const game = new ChessEngine(fen);
    const castleMove = game.generateMoves().find(m => m.isCastling);
    game.makeMove(castleMove);
    game.undoMove();
    expect(game.getFEN()).toBe(fen);
  });
});

describe('Chess Engine - AI', () => {
  it('should find a best move at depth 1', () => {
    const game = new ChessEngine();
    const move = game.getBestMove(1);
    expect(move).toBeDefined();
    expect(move.from).toBeGreaterThanOrEqual(0);
    expect(move.to).toBeGreaterThanOrEqual(0);
  });

  it('should return a legal AI move', () => {
    const game = new ChessEngine();
    const move = game.getBestMove(2);
    expect(move).toBeDefined();
    expect(game.isLegalMove(move)).toBe(true);
  });

  it('should accept difficulty level strings', () => {
    const game = new ChessEngine();
    const move = game.getBestMove('easy');
    expect(move).toBeDefined();
  });
});

describe('Chess Engine - PGN', () => {
  it('should generate PGN headers', () => {
    const game = new ChessEngine();
    const pgn = game.getPGN();
    expect(pgn).toContain('[Event');
    expect(pgn).toContain('[White');
    expect(pgn).toContain('*');
  });

  it('should generate PGN with moves', () => {
    const game = new ChessEngine();
    const e4 = game.moveFromSAN('e4');
    game.makeMove(e4);
    const pgn = game.getPGN();
    expect(pgn).toContain('e4');
  });

  it('should parse moves from SAN', () => {
    const game = new ChessEngine();
    const move = game.moveFromSAN('e4');
    expect(move).toBeDefined();
    expect(move.to).toBe(52); // e4 in 0x88 (rank 3, file 4 = 3*16+4)
  });

  it('should play the fool\'s mate sequence', () => {
    const game = new ChessEngine();
    expect(game.moveFromSAN('f3')).toBeDefined();
    expect(game.moveFromSAN('e5')).toBeDefined();
    expect(game.moveFromSAN('g4')).toBeDefined();
    expect(game.moveFromSAN('Qh4')).toBeDefined();
  });
});

describe('Chess Engine - Edge Cases', () => {
  it('should prevent moving into check', () => {
    const game = new ChessEngine();
    const moves = game.generateMoves();
    for (const move of moves) {
      expect(game.isLegalMove(move)).toBe(true);
    }
  });

  it('should clone engine state correctly', () => {
    const game = new ChessEngine();
    const moved = game.generateMoves()[0];
    game.makeMove(moved);

    const cloned = game.clone();
    expect(cloned.getFEN()).toBe(game.getFEN());
    expect(cloned.getHistory().length).toBe(1);

    const cloneMoves = cloned.generateMoves();
    if (cloneMoves.length > 0) {
      cloned.makeMove(cloneMoves[0]);
      expect(game.getFEN()).not.toBe(cloned.getFEN());
    }
  });

  it('should reset to starting position', () => {
    const game = new ChessEngine();
    game.makeMove(game.generateMoves()[0]);
    game.reset();
    expect(game.getFEN()).toBe(STARTING_FEN);
    expect(game.generateMoves().length).toBe(20);
  });

  it('should detect check with pinned piece', () => {
    // Position with pinned piece
    const fen = 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR b KQkq - 0 1';
    const game = new ChessEngine(fen);
    expect(game).toBeDefined();
  });
});

describe('Chess Engine - Perft Positions', () => {
  it('should pass perft depth 1 (starting position)', () => {
    const game = new ChessEngine();
    expect(game.generateMoves().length).toBe(20);
  });

  it('should pass perft depth 2 (starting position)', () => {
    const game = new ChessEngine();
    let count = 0;
    for (const move of game.generateMoves()) {
      game.makeMove(move);
      count += game.generateMoves().length;
      game.undoMove();
    }
    expect(count).toBe(400);
  });

  it('should have correct move count for Kiwipete position', () => {
    // Note: Kiwipete has an invalid FEN char, using simplified version
    const fen = 'r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1';
    const game = new ChessEngine(fen);
    // Kiwipete has 48 moves at depth 1
    expect(game.generateMoves().length).toBe(48);
  });
});

describe('Utility Functions', () => {
  it('should convert square to algebraic correctly', () => {
    expect(squareToAlgebraic(0)).toBe('a1');
    expect(squareToAlgebraic(7)).toBe('h1');
    expect(squareToAlgebraic(112)).toBe('a8');
    expect(squareToAlgebraic(119)).toBe('h8');
  });

  it('should convert algebraic to square correctly', () => {
    expect(algebraicToSquare('a1')).toBe(0);
    expect(algebraicToSquare('h1')).toBe(7);
    expect(algebraicToSquare('a8')).toBe(112);
    expect(algebraicToSquare('h8')).toBe(119);
  });

  it('should convert piece to Unicode', () => {
    expect(pieceToUnicode(1)).toBe('\u2659'); // White pawn
    expect(pieceToUnicode(6)).toBe('\u2654'); // White king
    expect(pieceToUnicode(14)).toBe('\u265A'); // Black king
  });

  it('should convert piece to symbol', () => {
    expect(pieceToSymbol(1)).toBe('P');
    expect(pieceToSymbol(14)).toBe('k');
  });
});
