/**
 * Ludo Game Engine
 * Core game logic including board representation, move validation, win detection
 */

import {
  PlayerColor,
  Player,
  Piece,
  PiecePosition,
  PieceState,
  GameState,
  GamePhase,
  GameSettings,
  Move,
  START_POSITIONS,
  SAFE_ZONES,
  HOME_ENTRY,
  MAIN_PATH_LENGTH,
  HOME_PATH_LENGTH,
  PIECES_PER_PLAYER,
  MAX_PLAYERS,
} from '@/types/game';

import { v4 as uuidv4 } from 'uuid';

// ============================================
// Board Geometry Utilities
// ============================================

/**
 * Get the visual (row, col) position for a main path index
 * The board is 15x15, path goes around the perimeter
 */
export function getMainPathCoordinates(pathIndex: number): { row: number; col: number } {
  // Path layout for 15x15 board:
  // Top row (row 6): indices 0-5 (left to right), then 6 is corner
  // Right col (col 8): indices 7-12 (top to bottom), then 13 is corner
  // Bottom row (row 8): indices 14-19 (right to left), then 20 is corner
  // Left col (col 6): indices 21-26 (bottom to top), then 27 is corner
  // Then repeats for each quadrant
  
  const normalized = pathIndex % MAIN_PATH_LENGTH;
  
  if (normalized <= 5) {
    // Top arm, left to right (row 6, cols 1-6)
    return { row: 6, col: 1 + normalized };
  } else if (normalized === 6) {
    // Top-right corner
    return { row: 6, col: 7 };
  } else if (normalized <= 12) {
    // Right arm, top to bottom (rows 7-12, col 8)
    return { row: 1 + (normalized - 7), col: 8 };
  } else if (normalized === 13) {
    // Bottom-right corner
    return { row: 7, col: 8 };
  } else if (normalized <= 19) {
    // Bottom arm, right to left (row 8, cols 7-1)
    return { row: 8, col: 8 - (normalized - 13) };
  } else if (normalized === 20) {
    // Bottom-left corner
    return { row: 8, col: 6 };
  } else if (normalized <= 26) {
    // Left arm, bottom to top (rows 7-1, col 6)
    return { row: 8 - (normalized - 20), col: 6 };
  } else if (normalized === 27) {
    // Top-left corner
    return { row: 6, col: 6 };
  } else if (normalized <= 33) {
    // Top arm continued (row 6, cols 8-13)
    return { row: 6, col: 8 + (normalized - 27) };
  } else if (normalized === 34) {
    // Top-right corner (second)
    return { row: 6, col: 14 };
  } else if (normalized <= 40) {
    // Right arm continued (rows 7-13, col 13)
    return { row: 1 + (normalized - 34), col: 13 };
  } else if (normalized === 41) {
    // Bottom-right corner (second)
    return { row: 8, col: 13 };
  } else if (normalized <= 47) {
    // Bottom arm continued (row 8, cols 12-6)
    return { row: 8, col: 13 - (normalized - 41) };
  } else if (normalized === 48) {
    // Bottom-left corner (second)
    return { row: 8, col: 6 };
  } else if (normalized <= 51) {
    // Left arm continued (rows 7-5, col 1)
    return { row: 8 - (normalized - 48), col: 1 };
  }
  
  return { row: 6, col: 1 };
}

/**
 * Get visual coordinates for home path
 */
export function getHomePathCoordinates(color: PlayerColor, homeIndex: number): { row: number; col: number } {
  // Home paths are in the center 3x3 area for each color
  const centerPositions: Record<PlayerColor, { row: number; col: number }> = {
    red: { row: 4, col: 4 },
    blue: { row: 4, col: 10 },
    green: { row: 10, col: 10 },
    yellow: { row: 10, col: 4 },
  };
  
  const center = centerPositions[color];
  const offsets = [
    { dr: -1, dc: 0 },  // 0: up
    { dr: -1, dc: 1 },  // 1: up-right
    { dr: 0, dc: 1 },   // 2: right
    { dr: 1, dc: 1 },   // 3: down-right
    { dr: 1, dc: 0 },   // 4: down
    { dr: 1, dc: -1 },  // 5: down-left (center)
  ];
  
  const offset = offsets[homeIndex] || { dr: 0, dc: 0 };
  return { row: center.row + offset.dr, col: center.col + offset.dc };
}

/**
 * Get visual coordinates for base pieces
 */
export function getBaseCoordinates(color: PlayerColor, pieceIndex: number): { row: number; col: number } {
  const basePositions: Record<PlayerColor, { row: number; col: number }[]> = {
    red: [
      { row: 2, col: 2 }, { row: 2, col: 3 }, { row: 3, col: 2 }, { row: 3, col: 3 }
    ],
    blue: [
      { row: 2, col: 11 }, { row: 2, col: 12 }, { row: 3, col: 11 }, { row: 3, col: 12 }
    ],
    green: [
      { row: 11, col: 11 }, { row: 11, col: 12 }, { row: 12, col: 11 }, { row: 12, col: 12 }
    ],
    yellow: [
      { row: 11, col: 2 }, { row: 11, col: 3 }, { row: 12, col: 2 }, { row: 12, col: 3 }
    ],
  };
  
  return basePositions[color][pieceIndex] || { row: 0, col: 0 };
}

// ============================================
// Game Engine Class
// ============================================

export class LudoGameEngine {
  private state: GameState;
  
  constructor(settings?: Partial<GameSettings>) {
    this.state = this.createInitialState(settings);
  }
  
  private createInitialState(settings?: Partial<GameSettings>): GameState {
    const defaultSettings: GameSettings = {
      maxPlayers: 4,
      allowSpectators: false,
      privateRoom: false,
      winCondition: 'all-pieces',
      timeLimitPerTurn: 30,
    };
    
    return {
      id: uuidv4(),
      phase: 'waiting',
      players: [],
      currentPlayerIndex: 0,
      diceValue: null,
      diceRolling: false,
      winner: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      settings: { ...defaultSettings, ...settings },
      moveHistory: [],
    };
  }
  
  // ============================================
  // State Accessors
  // ============================================
  
  getState(): GameState {
    return { ...this.state };
  }
  
  getCurrentPlayer(): Player | null {
    if (this.state.players.length === 0) return null;
    return this.state.players[this.state.currentPlayerIndex];
  }
  
  getPlayer(playerId: string): Player | undefined {
    return this.state.players.find(p => p.id === playerId);
  }
  
  getPiece(pieceId: string): Piece | undefined {
    for (const player of this.state.players) {
      const piece = player.pieces.find(p => p.id === pieceId);
      if (piece) return piece;
    }
    return undefined;
  }
  
  // ============================================
  // Player Management
  // ============================================
  
  addPlayer(name: string, color: PlayerColor, isHost = false): Player {
    const player: Player = {
      id: uuidv4(),
      name,
      color,
      pieces: this.createInitialPieces(color),
      isHost,
      isConnected: true,
      joinedAt: Date.now(),
    };
    
    this.state.players.push(player);
    this.state.updatedAt = Date.now();
    return player;
  }
  
  removePlayer(playerId: string): boolean {
    const index = this.state.players.findIndex(p => p.id === playerId);
    if (index === -1) return false;
    
    this.state.players.splice(index, 1);
    
    // Adjust current player index if needed
    if (this.state.currentPlayerIndex >= this.state.players.length) {
      this.state.currentPlayerIndex = 0;
    }
    
    this.state.updatedAt = Date.now();
    return true;
  }
  
  private createInitialPieces(color: PlayerColor): Piece[] {
    const pieces: Piece[] = [];
    for (let i = 0; i < PIECES_PER_PLAYER; i++) {
      pieces.push({
        id: uuidv4(),
        playerId: '', // Will be set when player is created
        color,
        position: { pathIndex: -1, pathType: 'base' },
        state: 'base',
        index: i,
      });
    }
    return pieces;
  }
  
  // ============================================
  // Game Flow
  // ============================================
  
  startGame(): boolean {
    if (this.state.players.length < 2) return false;
    if (this.state.phase !== 'waiting') return false;
    
    // Assign player IDs to pieces
    for (const player of this.state.players) {
      for (const piece of player.pieces) {
        piece.playerId = player.id;
      }
    }
    
    this.state.phase = 'playing';
    this.state.currentPlayerIndex = 0;
    this.state.updatedAt = Date.now();
    return true;
  }
  
  rollDice(): number {
    if (this.state.phase !== 'playing') throw new Error('Game not in progress');
    if (this.state.diceRolling) throw new Error('Dice already rolling');
    
    this.state.diceRolling = true;
    const value = Math.floor(Math.random() * 6) + 1;
    this.state.diceValue = value;
    this.state.diceRolling = false;
    this.state.updatedAt = Date.now();
    
    return value;
  }
  
  getMovablePieces(playerId: string): Piece[] {
    const player = this.getPlayer(playerId);
    if (!player) return [];
    
    const diceValue = this.state.diceValue;
    if (!diceValue) return [];
    
    return player.pieces.filter(piece => this.canMovePiece(piece, diceValue));
  }
  
  movePiece(pieceId: string): Move | null {
    const piece = this.getPiece(pieceId);
    if (!piece) return null;
    
    const player = this.getPlayer(piece.playerId);
    if (!player) return null;
    
    // Verify it's the player's turn
    if (this.getCurrentPlayer()?.id !== player.id) return null;
    
    const diceValue = this.state.diceValue;
    if (!diceValue) return null;
    
    // Validate move
    if (!this.canMovePiece(piece, diceValue)) return null;
    
    const fromPosition = { ...piece.position };
    let capturedPieceId: string | null = null;
    
    // Execute move
    this.executeMove(piece, diceValue);
    
    // Check for captures
    const capturedPiece = this.checkCapture(piece);
    if (capturedPiece) {
      capturedPieceId = capturedPiece.id;
      this.sendToBase(capturedPiece);
    }
    
    // Check win condition
    this.checkWinCondition(player.id);
    
    // Create move record
    const move: Move = {
      id: uuidv4(),
      playerId: player.id,
      pieceId: piece.id,
      diceValue,
      fromPosition,
      toPosition: { ...piece.position },
      capturedPieceId,
      timestamp: Date.now(),
      isValid: true,
    };
    
    this.state.moveHistory.push(move);
    this.state.diceValue = null;
    this.state.updatedAt = Date.now();
    
    // Handle turn progression
    if (diceValue !== 6) {
      this.nextTurn();
    }
    // If dice is 6, player gets another turn (unless all pieces finished)
    
    return move;
  }
  
  private executeMove(piece: Piece, diceValue: number): void {
    if (piece.state === 'base') {
      // Move from base to start position
      if (diceValue === 6) {
        piece.state = 'active';
        piece.position = {
          pathIndex: START_POSITIONS[piece.color],
          pathType: 'main',
        };
      }
    } else if (piece.state === 'active') {
      // Move along main path
      const currentIndex = piece.position.pathIndex;
      const startIndex = START_POSITIONS[piece.color];
      const homeEntryIndex = HOME_ENTRY[piece.color];
      
      // Calculate distance to home entry
      let distanceToHome: number;
      if (currentIndex <= homeEntryIndex) {
        distanceToHome = homeEntryIndex - currentIndex;
      } else {
        distanceToHome = (MAIN_PATH_LENGTH - currentIndex) + homeEntryIndex;
      }
      
      if (diceValue <= distanceToHome) {
        // Normal move on main path
        piece.position.pathIndex = (currentIndex + diceValue) % MAIN_PATH_LENGTH;
      } else if (diceValue === distanceToHome + 1) {
        // Enter home path
        piece.state = 'home';
        piece.position = {
          pathIndex: 0,
          pathType: 'home',
        };
      } else if (diceValue > distanceToHome + 1) {
        // Move within home path
        const homeSteps = diceValue - distanceToHome - 1;
        if (homeSteps < HOME_PATH_LENGTH) {
          piece.position.pathIndex = homeSteps;
        } else if (homeSteps === HOME_PATH_LENGTH) {
          // Piece finishes
          piece.state = 'finished';
          piece.position = { pathIndex: 999, pathType: 'main' };
        }
        // If homeSteps > HOME_PATH_LENGTH, invalid move (handled by canMovePiece)
      }
    } else if (piece.state === 'home') {
      // Move within home path
      const newHomeIndex = piece.position.pathIndex + diceValue;
      if (newHomeIndex < HOME_PATH_LENGTH) {
        piece.position.pathIndex = newHomeIndex;
      } else if (newHomeIndex === HOME_PATH_LENGTH) {
        // Piece finishes
        piece.state = 'finished';
        piece.position = { pathIndex: 999, pathType: 'main' };
      }
      // If newHomeIndex > HOME_PATH_LENGTH, invalid move
    }
    // Finished pieces cannot move
  }
  
  private canMovePiece(piece: Piece, diceValue: number): boolean {
    if (piece.state === 'finished') return false;
    
    if (piece.state === 'base') {
      return diceValue === 6;
    }
    
    if (piece.state === 'active') {
      const currentIndex = piece.position.pathIndex;
      const homeEntryIndex = HOME_ENTRY[piece.color];
      
      let distanceToHome: number;
      if (currentIndex <= homeEntryIndex) {
        distanceToHome = homeEntryIndex - currentIndex;
      } else {
        distanceToHome = (MAIN_PATH_LENGTH - currentIndex) + homeEntryIndex;
      }
      
      // Can move if dice <= distance to home + home path length
      return diceValue <= distanceToHome + HOME_PATH_LENGTH;
    }
    
    if (piece.state === 'home') {
      return piece.position.pathIndex + diceValue <= HOME_PATH_LENGTH;
    }
    
    return false;
  }
  
  private checkCapture(piece: Piece): Piece | null {
    if (piece.state !== 'active') return null;
    
    const currentPos = piece.position.pathIndex;
    
    // Check if current position is a safe zone
    if (SAFE_ZONES.includes(currentPos)) return null;
    
    // Check if it's a start position (also safe)
    const startPositions = Object.values(START_POSITIONS);
    if (startPositions.includes(currentPos)) return null;
    
    // Look for opponent pieces at same position
    for (const player of this.state.players) {
      if (player.id === piece.playerId) continue;
      
      for (const opponentPiece of player.pieces) {
        if (opponentPiece.state === 'active' && 
            opponentPiece.position.pathIndex === currentPos &&
            opponentPiece.position.pathType === 'main') {
          return opponentPiece;
        }
      }
    }
    
    return null;
  }
  
  private sendToBase(piece: Piece): void {
    piece.state = 'base';
    piece.position = { pathIndex: -1, pathType: 'base' };
  }
  
  private checkWinCondition(playerId: string): void {
    const player = this.getPlayer(playerId);
    if (!player) return;
    
    const finishedCount = player.pieces.filter(p => p.state === 'finished').length;
    
    if (finishedCount === PIECES_PER_PLAYER) {
      this.state.phase = 'finished';
      this.state.winner = playerId;
      this.state.updatedAt = Date.now();
    }
  }
  
  private nextTurn(): void {
    if (this.state.players.length === 0) return;
    
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    this.state.updatedAt = Date.now();
  }
  
  passTurn(): boolean {
    if (this.state.phase !== 'playing') return false;
    if (this.state.diceValue !== null) return false; // Must roll first
    
    this.nextTurn();
    return true;
  }
  
  // ============================================
  // Serialization
  // ============================================
  
  serialize(): string {
    return JSON.stringify(this.state);
  }
  
  static deserialize(data: string): LudoGameEngine {
    const engine = new LudoGameEngine();
    engine.state = JSON.parse(data);
    return engine;
  }
}

// ============================================
// Helper Functions
// ============================================

export function createGameEngine(settings?: Partial<GameSettings>): LudoGameEngine {
  return new LudoGameEngine(settings);
}

export function validateMove(
  engine: LudoGameEngine,
  playerId: string,
  pieceId: string,
  diceValue: number
): { valid: boolean; reason?: string } {
  const player = engine.getPlayer(playerId);
  if (!player) return { valid: false, reason: 'Player not found' };
  
  const piece = engine.getPiece(pieceId);
  if (!piece) return { valid: false, reason: 'Piece not found' };
  
  if (piece.playerId !== playerId) return { valid: false, reason: 'Piece does not belong to player' };
  
  const currentPlayer = engine.getCurrentPlayer();
  if (!currentPlayer || currentPlayer.id !== playerId) {
    return { valid: false, reason: 'Not your turn' };
  }
  
  if (engine.getState().diceValue !== diceValue) {
    return { valid: false, reason: 'Dice value mismatch' };
  }
  
  if (!engine.getMovablePieces(playerId).some(p => p.id === pieceId)) {
    return { valid: false, reason: 'Piece cannot move with this dice value' };
  }
  
  return { valid: true };
}