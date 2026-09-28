// UI Controller - Connects chess engine to DOM
// ES Module

import ChessEngine, {
  STARTING_FEN,
  pieceToUnicode,
  squareToAlgebraic,
  COLORS
} from './chess.js';

export class ChessUI {
  constructor() {
    this.game = new ChessEngine();
    this.selectedSquare = null;
    this.validMoves = [];
    this.isFlipped = false;
    this.lastMove = null;

    // DOM elements
    this.boardEl = document.getElementById('board');
    this.statusEl = document.getElementById('status');
    this.movesEl = document.getElementById('moves');
    this.modeEl = document.getElementById('mode');
    this.colorEl = document.getElementById('color');
    this.newGameBtn = document.getElementById('newGame');
    this.undoBtn = document.getElementById('undo');
    this.flipBtn = document.getElementById('flip');
    this.hintBtn = document.getElementById('hint');
    this.promotionModal = document.getElementById('promotionModal');
    this.promotionOptions = document.getElementById('promotionOptions');

    this.aiColor = COLORS.BLACK;
    this.aiDifficulty = 2;
  }

  init() {
    this.bindControls();
    this.renderBoard();
    this.updateStatus();
    this.updateMoveList();
  }

  bindControls() {
    if (this.newGameBtn) {
      this.newGameBtn.addEventListener('click', () => this.newGame());
    }
    if (this.undoBtn) {
      this.undoBtn.addEventListener('click', () => this.undo());
    }
    if (this.flipBtn) {
      this.flipBtn.addEventListener('click', () => this.flipBoard());
    }
    if (this.hintBtn) {
      this.hintBtn.addEventListener('click', () => this.showHint());
    }
    if (this.modeEl) {
      this.modeEl.addEventListener('change', () => this.onModeChange());
    }
    if (this.colorEl) {
      this.colorEl.addEventListener('change', () => this.onColorChange());
    }
    if (this.boardEl) {
      this.boardEl.addEventListener('click', (e) => this.onBoardClick(e));
    }
    // Modal close
    if (this.promotionModal) {
      this.promotionModal.addEventListener('click', (e) => {
        if (e.target === this.promotionModal) {
          this.hidePromotionModal();
        }
      });
    }
  }

  renderBoard() {
    if (!this.boardEl) return;

    const board = this.game.getBoard();
    const isFlipped = this.isFlipped || (this.game.turn === COLORS.WHITE && false);

    this.boardEl.innerHTML = '';
    this.boardEl.classList.toggle('flipped', isFlipped);

    const squares = [];
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const sq = rank * 16 + file;
        const displayRank = this.isFlipped ? 7 - rank : rank;
        const displayFile = this.isFlipped ? 7 - file : file;
        const actualSq = displayRank * 16 + displayFile;
        const piece = board[displayRank][displayFile];
        const isLight = (displayRank + displayFile) % 2 === 1;

        const squareEl = document.createElement('div');
        squareEl.className = `square ${isLight ? 'light' : 'dark'}`;
        squareEl.dataset.square = actualSq;

        if (piece !== 0) {
          squareEl.textContent = pieceToUnicode(piece);
        }

        squares.push(squareEl);
      }
    }

    this.boardEl.append(...squares);
    this.updateSquareHighlights();
  }

  updateSquareHighlights() {
    // Clear previous highlights
    const allSquares = this.boardEl.querySelectorAll('.square');
    allSquares.forEach(sq => {
      sq.classList.remove('selected', 'highlight', 'capture-highlight', 'last-move');
    });

    // Highlight last move
    if (this.lastMove) {
      const fromSq = squareToAlgebraic(this.lastMove.from);
      const toSq = squareToAlgebraic(this.lastMove.to);
      this.highlightSquare(fromSq, 'last-move');
      this.highlightSquare(toSq, 'last-move');
    }

    // Highlight selected square
    if (this.selectedSquare !== null) {
      const alg = squareToAlgebraic(this.selectedSquare);
      this.highlightSquare(alg, 'selected');

      // Highlight valid moves
      this.validMoves.forEach(move => {
        const toAlg = squareToAlgebraic(move.to);
        if (move.isCapture || move.isEnPassant) {
          this.highlightSquare(toAlg, 'capture-highlight');
        } else {
          this.highlightSquare(toAlg, 'highlight');
        }
      });
    }
  }

  highlightSquare(alg, className) {
    const sq = this.game.algebraicToSquare(alg);
    if (sq === 0x88) return;
    const displayRank = this.isFlipped ? 7 - (sq >> 4) : (sq >> 4);
    const displayFile = this.isFlipped ? 7 - (sq & 0x07) : (sq & 0x07);
    const board = this.game.getBoard();
    const row = displayRank;
    const col = displayFile;
    const index = row * 8 + col;
    const square = this.boardEl.children[index];
    if (square) square.classList.add(className);
  }

  onBoardClick(e) {
    const square = e.target.closest('.square');
    if (!square) return;

    const sqStr = square.dataset.square;
    const sq = parseInt(sqStr);

    if (this.selectedSquare === null) {
      // Selecting a piece
      const piece = this.game.board[sq];
      if (piece !== 0) {
        const pieceColor = isWhitePiece(piece) ? COLORS.WHITE : COLORS.BLACK;
        if (pieceColor === this.game.turn) {
          this.selectedSquare = sq;
          this.validMoves = this.game.generateMoves().filter(m => m.from === sq);
          this.updateSquareHighlights();
        }
      }
    } else {
      // Attempting to make a move
      const targetSq = sq;

      // Find matching legal move
      const move = this.game.generateMoves().find(
        m => m.from === this.selectedSquare && m.to === targetSq
      );

      if (move) {
        this.makeMoveWithPossiblePromotion(move);
      } else {
        // Maybe select a different piece
        const piece = this.game.board[sq];
        if (piece !== 0) {
          const pieceColor = isWhitePiece(piece) ? COLORS.WHITE : COLORS.BLACK;
          if (pieceColor === this.game.turn) {
            this.selectedSquare = sq;
            this.validMoves = this.game.generateMoves().filter(m => m.from === sq);
            this.updateSquareHighlights();
            return;
          }
        }
        this.selectedSquare = null;
        this.validMoves = [];
        this.updateSquareHighlights();
      }
    }
  }

  async makeMoveWithPossiblePromotion(move) {
    if (move.isPromotion) {
      // Show promotion modal
      this.showPromotionModal(move, (promotionPiece) => {
        move.promotion = promotionPiece;
        this.executeMove(move);
      });
    } else {
      this.executeMove(move);
    }
  }

  executeMove(move) {
    this.game.makeMove(move);
    this.lastMove = move;
    this.selectedSquare = null;
    this.validMoves = [];
    this.renderBoard();
    this.updateMoveList();
    this.updateStatus();

    // Check for AI move
    this.checkAIMove();
  }

  showPromotionModal(move, callback) {
    if (!this.promotionModal) return;

    const isWhite = move.promotion >= 1 && move.promotion <= 6;
    const pieces = [
      { label: isWhite ? 'Q' : 'q', value: 5, symbol: '♕', unicode: '\u2655' },
      { label: isWhite ? 'R' : 'r', value: 4, symbol: '♖', unicode: '\u2656' },
      { label: isWhite ? 'B' : 'b', value: 3, symbol: '♗', unicode: '\u2657' },
      { label: isWhite ? 'N' : 'n', value: 2, symbol: '♘', unicode: '\u2658' }
    ];

    this.promotionOptions.innerHTML = '';
    pieces.forEach(p => {
      const btn = document.createElement('button');
      btn.textContent = p.unicode;
      btn.title = p.label;
      btn.addEventListener('click', () => {
        this.promotionModal.classList.remove('active');
        callback(p.value);
      });
      this.promotionOptions.appendChild(btn);
    });

    this.promotionModal.classList.add('active');
  }

  hidePromotionModal() {
    if (this.promotionModal) {
      this.promotionModal.classList.remove('active');
    }
  }

  updateStatus() {
    if (!this.statusEl) return;

    const result = this.game.getGameResult();
    let statusText = '';

    if (result) {
      if (result.winner) {
        if (result.reason === 'checkmate') {
          const winner = result.winner === COLORS.WHITE ? 'White' : 'Black';
          statusText = `Checkmate! ${winner} wins`;
          this.statusEl.className = 'status checkmate';
        } else {
          statusText = 'Game over';
          this.statusEl.className = 'status';
        }
      } else {
        const reasonMap = {
          'stalemate': 'Stalemate - Draw',
          'fifty-move': 'Draw - 50-move rule',
          'threefold-repetition': 'Draw - Threefold repetition',
          'insufficient-material': 'Draw - Insufficient material'
        };
        statusText = reasonMap[result.reason] || 'Draw';
        this.statusEl.className = 'status draw';
      }
    } else {
      if (this.game.isInCheck()) {
        const color = this.game.turn === COLORS.WHITE ? 'White' : 'Black';
        statusText = `${color} is in check`;
        this.statusEl.className = 'status check';
      } else {
        const color = this.game.turn === COLORS.WHITE ? 'White' : 'Black';
        statusText = `${color} to move`;
        this.statusEl.className = 'status';
      }
    }

    this.statusEl.textContent = statusText;
  }

  updateMoveList() {
    if (!this.movesEl) return;

    this.movesEl.innerHTML = '';
    const history = this.game.getHistory();

    for (let i = 0; i < history.length; i += 2) {
      const li = document.createElement('li');
      const moveNum = Math.floor(i / 2) + 1;

      const whiteMove = history[i];
      const blackMove = history[i + 1];

      const whiteSAN = this.game.moveToSAN(whiteMove);
      const blackSAN = blackMove ? this.game.moveToSAN(blackMove) : '';

      li.innerHTML = `<span class="move-number">${moveNum}.</span> <span class="white-move">${whiteSAN}</span> <span class="black-move">${blackSAN}</span>`;
      this.movesEl.appendChild(li);
    }

    // Scroll to bottom
    this.movesEl.scrollTop = this.movesEl.scrollHeight;
  }

  newGame() {
    const mode = this.modeEl ? this.modeEl.value : 'pvp';
    const color = this.colorEl ? this.colorEl.value : 'white';

    this.game = new ChessEngine();
    this.selectedSquare = null;
    this.validMoves = [];
    this.lastMove = null;
    this.isFlipped = false;

    if (mode === 'ai') {
      this.aiColor = color === 'white' ? COLORS.BLACK : COLORS.WHITE;
    }

    this.renderBoard();
    this.updateStatus();
    this.updateMoveList();

    // If playing as black vs AI, let AI move first
    if (mode === 'ai' && this.aiColor === COLORS.WHITE) {
      setTimeout(() => this.checkAIMove(), 500);
    }
  }

  undo() {
    if (this.game.getHistory().length === 0) return;
    this.game.undoMove();
    this.selectedSquare = null;
    this.validMoves = [];
    this.lastMove = this.game.getHistory()[this.game.getHistory().length - 1] || null;
    this.renderBoard();
    this.updateMoveList();
    this.updateStatus();
    this.checkAIMove();
  }

  flipBoard() {
    this.isFlipped = !this.isFlipped;
    this.renderBoard();
  }

  showHint() {
    const bestMove = this.game.getBestMove(this.aiDifficulty || 2);
    if (bestMove) {
      this.selectedSquare = bestMove.from;
      this.validMoves = [bestMove];
      this.updateSquareHighlights();

      setTimeout(() => {
        this.selectedSquare = null;
        this.validMoves = [];
        this.updateSquareHighlights();
      }, 1500);
    }
  }

  async checkAIMove() {
    const mode = this.modeEl ? this.modeEl.value : 'pvp';
    if (mode !== 'ai') return;

    const result = this.game.getGameResult();
    if (result) return;

    const aiColor = this.aiColor;

    if (this.game.turn === aiColor) {
      const bestMove = this.game.getBestMove(this.aiDifficulty || 2);
      if (bestMove) {
        setTimeout(() => {
          this.executeMove(bestMove);
        }, 300);
      }
    }
  }

  onModeChange() {
    // Mode will be applied on new game
  }

  onColorChange() {
    // Color will be applied on new game
  }
}

function isWhitePiece(piece) {
  return piece >= 1 && piece <= 6;
}

document.addEventListener('DOMContentLoaded', () => {
  const ui = new ChessUI();
  ui.init();
});

export default ChessUI;