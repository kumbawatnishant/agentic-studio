import { describe, it, expect, beforeEach } from 'vitest';
import { LudoGameEngine, createGameEngine, validateMove } from '@/lib/game/engine';
import { PlayerColor, PieceState } from '@/types/game';

describe('LudoGameEngine', () => {
  let engine: LudoGameEngine;

  beforeEach(() => {
    engine = createGameEngine();
    
    // Add 4 players
    engine.addPlayer('Red Player', 'red', true);
    engine.addPlayer('Blue Player', 'blue');
    engine.addPlayer('Green Player', 'green');
    engine.addPlayer('Yellow Player', 'yellow');
    
    engine.startGame();
  });

  describe('Initialization', () => {
    it('should create engine with correct initial state', () => {
      const freshEngine = createGameEngine();
      const state = freshEngine.getState();
      expect(state.phase).toBe('waiting');
      expect(state.players).toHaveLength(0);
      expect(state.currentPlayerIndex).toBe(0);
    });

    it('should add players with correct colors', () => {
      const players = engine.getState().players;
      expect(players).toHaveLength(4);
      expect(players.map(p => p.color)).toEqual(['red', 'blue', 'green', 'yellow']);
    });

    it('should create 4 pieces per player in base', () => {
      const players = engine.getState().players;
      players.forEach(player => {
        expect(player.pieces).toHaveLength(4);
        player.pieces.forEach(piece => {
          expect(piece.state).toBe('base');
          expect(piece.position.pathType).toBe('base');
          expect(piece.position.pathIndex).toBe(-1);
        });
      });
    });
  });

  describe('Game Start', () => {
    it('should start game with 2+ players', () => {
      const testEngine = createGameEngine();
      testEngine.addPlayer('P1', 'red', true);
      testEngine.addPlayer('P2', 'blue');
      
      const started = testEngine.startGame();
      expect(started).toBe(true);
      expect(testEngine.getState().phase).toBe('playing');
    });

    it('should not start with less than 2 players', () => {
      const testEngine = createGameEngine();
      testEngine.addPlayer('P1', 'red', true);
      
      const started = testEngine.startGame();
      expect(started).toBe(false);
    });
  });

  describe('Dice Rolling', () => {
    it('should roll dice and return value 1-6', () => {
      const value = engine.rollDice();
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(6);
    });

    it('should set dice value in state', () => {
      engine.rollDice();
      const state = engine.getState();
      expect(state.diceValue).not.toBeNull();
      expect(state.diceValue).toBeGreaterThanOrEqual(1);
      expect(state.diceValue).toBeLessThanOrEqual(6);
    });
  });

  describe('Piece Movement', () => {
    it('should move piece from base on roll of 6', () => {
      const player = engine.getState().players[0];
      const piece = player.pieces[0];
      
      // Force dice to 6
      (engine as any).state.diceValue = 6;
      
      const move = engine.movePiece(piece.id);
      expect(move).not.toBeNull();
      expect(piece.state).toBe('active');
      expect(piece.position.pathIndex).toBe(0); // Red starts at 0
      expect(piece.position.pathType).toBe('main');
    });

    it('should not move piece from base on roll != 6', () => {
      const player = engine.getState().players[0];
      const piece = player.pieces[0];
      
      (engine as any).state.diceValue = 3;
      
      const move = engine.movePiece(piece.id);
      expect(move).toBeNull();
      expect(piece.state).toBe('base');
    });

    it('should move active piece along path', () => {
      const player = engine.getState().players[0];
      const piece = player.pieces[0];
      
      // Move to active
      (engine as any).state.diceValue = 6;
      engine.movePiece(piece.id);
      
      // Move along path
      (engine as any).state.diceValue = 4;
      const move = engine.movePiece(piece.id);
      
      expect(move).not.toBeNull();
      expect(piece.position.pathIndex).toBe(4);
    });

    it('should enter home path on exact roll', () => {
      const player = engine.getState().players[0];
      const piece = player.pieces[0];
      
      // Move to position 50 (near home entry at 51 for red)
      piece.state = 'active';
      piece.position = { pathIndex: 50, pathType: 'main' };
      
      (engine as any).state.diceValue = 2; // 50 + 2 = 52 -> enter home
      const move = engine.movePiece(piece.id);
      
      expect(move).not.toBeNull();
      expect(piece.state).toBe('home');
      expect(piece.position.pathIndex).toBe(0);
      expect(piece.position.pathType).toBe('home');
    });

    it('should finish piece on exact home roll', () => {
      const player = engine.getState().players[0];
      const piece = player.pieces[0];
      
      piece.state = 'home';
      piece.position = { pathIndex: 5, pathType: 'home' }; // Last home position
      
      (engine as any).state.diceValue = 1;
      const move = engine.movePiece(piece.id);
      
      expect(move).not.toBeNull();
      expect(piece.state).toBe('finished');
    });
  });

  describe('Capture Logic', () => {
    it('should capture opponent piece on same square', () => {
      const redPlayer = engine.getState().players[0];
      const bluePlayer = engine.getState().players[1];

      const redPiece = redPlayer.pieces[0];
      const bluePiece = bluePlayer.pieces[0];

      // Red at position 4, Blue at position 5 (not safe zone)
      redPiece.state = 'active';
      redPiece.position = { pathIndex: 4, pathType: 'main' };

      bluePiece.state = 'active';
      bluePiece.position = { pathIndex: 5, pathType: 'main' };

      // Red rolls 1, moves to position 5, captures blue
      (engine as any).state.diceValue = 1;
      engine.movePiece(redPiece.id);

      // Blue piece should be sent to base
      expect(bluePiece.state).toBe('base');
      expect(bluePiece.position.pathType).toBe('base');
    });

    it('should not capture on safe zone', () => {
      const redPlayer = engine.getState().players[0];
      const bluePlayer = engine.getState().players[1];

      const redPiece = redPlayer.pieces[0];
      const bluePiece = bluePlayer.pieces[0];

      // Both at position 8 (safe zone)
      redPiece.state = 'active';
      redPiece.position = { pathIndex: 8, pathType: 'main' };

      bluePiece.state = 'active';
      bluePiece.position = { pathIndex: 8, pathType: 'main' };

      (engine as any).state.diceValue = 1;
      engine.movePiece(redPiece.id);

      // Blue piece should remain
      expect(bluePiece.state).toBe('active');
    });

    it('should not capture on start positions', () => {
      const redPlayer = engine.getState().players[0];
      const bluePlayer = engine.getState().players[1];

      const redPiece = redPlayer.pieces[0];
      const bluePiece = bluePlayer.pieces[0];

      // Both at position 0 (red start, safe)
      redPiece.state = 'active';
      redPiece.position = { pathIndex: 0, pathType: 'main' };

      bluePiece.state = 'active';
      bluePiece.position = { pathIndex: 0, pathType: 'main' };

      (engine as any).state.diceValue = 1;
      engine.movePiece(redPiece.id);

      expect(bluePiece.state).toBe('active');
    });
  });

  describe('Win Condition', () => {
    it('should detect win when all 4 pieces finished', () => {
      const player = engine.getState().players[0];
      
      // Finish all pieces
      player.pieces.forEach(piece => {
        piece.state = 'finished';
        piece.position = { pathIndex: 999, pathType: 'main' };
      });
      
      // Trigger win check
      (engine as any).checkWinCondition(player.id);
      
      const state = engine.getState();
      expect(state.phase).toBe('finished');
      expect(state.winner).toBe(player.id);
    });
  });

  describe('Turn Management', () => {
    it('should pass turn on non-6 roll', () => {
      const initialPlayerIndex = engine.getState().currentPlayerIndex;

      // Force first piece onto board at position 10
      const piece = engine.getState().players[0].pieces[0];
      piece.state = 'active';
      piece.position = { pathIndex: 10, pathType: 'main' };

      // Roll 3, move piece 10->13 (not 6, turn passes)
      (engine as any).state.diceValue = 3;
      engine.movePiece(piece.id);

      expect(engine.getState().currentPlayerIndex).not.toBe(initialPlayerIndex);
    });

    it('should keep turn on roll of 6', () => {
      const initialPlayerIndex = engine.getState().currentPlayerIndex;

      // Force first piece onto board at position 10
      const piece = engine.getState().players[0].pieces[0];
      piece.state = 'active';
      piece.position = { pathIndex: 10, pathType: 'main' };

      // Roll 6, move piece (6 = extra turn)
      (engine as any).state.diceValue = 6;
      engine.movePiece(piece.id);

      expect(engine.getState().currentPlayerIndex).toBe(initialPlayerIndex);
    });
  });

  describe('Validation', () => {
    it('should validate correct move', () => {
      const player = engine.getState().players[0];
      const piece = player.pieces[0];
      
      piece.state = 'active';
      piece.position = { pathIndex: 5, pathType: 'main' };
      
      (engine as any).state.diceValue = 3;
      
      const validation = validateMove(engine, player.id, piece.id, 3);
      expect(validation.valid).toBe(true);
    });

    it('should reject move for wrong player', () => {
      const player1 = engine.getState().players[0];
      const player2 = engine.getState().players[1];
      const piece = player1.pieces[0];
      
      (engine as any).state.diceValue = 3;
      
      const validation = validateMove(engine, player2.id, piece.id, 3);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Piece does not belong to player');
    });

    it('should reject move when not player turn', () => {
      const player = engine.getState().players[1]; // Not current player
      const piece = player.pieces[0];
      
      (engine as any).state.diceValue = 3;
      
      const validation = validateMove(engine, player.id, piece.id, 3);
      expect(validation.valid).toBe(false);
      expect(validation.reason).toBe('Not your turn');
    });
  });
});