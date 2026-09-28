/**
 * Ludo Game Types
 * Complete type definitions for the game engine, socket events, and UI state
 */

// ============================================
// Core Game Types
// ============================================

export type PlayerColor = 'red' | 'blue' | 'green' | 'yellow';
export type PlayerId = string;
export type GameId = string;
export type PieceId = string;

export interface Player {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  pieces: Piece[];
  isHost: boolean;
  isConnected: boolean;
  joinedAt: number;
}

export interface Piece {
  id: PieceId;
  playerId: PlayerId;
  color: PlayerColor;
  position: PiecePosition;
  state: PieceState;
  index: number; // 0-3 for the 4 pieces
}

export type PieceState = 'base' | 'active' | 'home' | 'finished';

export interface PiecePosition {
  // For base pieces: -1
  // For active pieces: 0-51 (main board path)
  // For home path: 100-105 (home stretch)
  // For finished: 999
  pathIndex: number;
  // Which path: 'main' | 'home' | 'base'
  pathType: 'main' | 'home' | 'base';
}

// Board geometry constants
export const BOARD_SIZE = 15; // 15x15 grid
export const MAIN_PATH_LENGTH = 52;
export const HOME_PATH_LENGTH = 6;
export const PIECES_PER_PLAYER = 4;
export const MAX_PLAYERS = 4;
export const MIN_PLAYERS = 2;

// Starting positions for each color on main path (0-51)
export const START_POSITIONS: Record<PlayerColor, number> = {
  red: 0,
  blue: 13,
  green: 26,
  yellow: 39,
};

// Safe zones (star squares) - indices on main path
export const SAFE_ZONES = [0, 8, 13, 21, 26, 34, 39, 47];

// Home entry points for each color
export const HOME_ENTRY: Record<PlayerColor, number> = {
  red: 51,
  blue: 12,
  green: 25,
  yellow: 38,
};

// Base positions (visual coordinates for each piece in base)
export const BASE_POSITIONS: Record<PlayerColor, { row: number; col: number }[]> = {
  red: [
    { row: 1, col: 1 },
    { row: 1, col: 2 },
    { row: 2, col: 1 },
    { row: 2, col: 2 },
  ],
  blue: [
    { row: 1, col: 12 },
    { row: 1, col: 13 },
    { row: 2, col: 12 },
    { row: 2, col: 13 },
  ],
  green: [
    { row: 12, col: 12 },
    { row: 12, col: 13 },
    { row: 13, col: 12 },
    { row: 13, col: 13 },
  ],
  yellow: [
    { row: 12, col: 1 },
    { row: 12, col: 2 },
    { row: 13, col: 1 },
    { row: 13, col: 2 },
  ],
};

// ============================================
// Game State
// ============================================

export type GamePhase = 'waiting' | 'playing' | 'finished';

export interface GameState {
  id: GameId;
  phase: GamePhase;
  players: Player[];
  currentPlayerIndex: number;
  diceValue: number | null;
  diceRolling: boolean;
  winner: PlayerId | null;
  createdAt: number;
  updatedAt: number;
  settings: GameSettings;
  moveHistory: Move[];
}

export interface GameSettings {
  maxPlayers: number;
  allowSpectators: boolean;
  privateRoom: boolean;
  winCondition: 'all-pieces' | 'first-piece' | 'points';
  timeLimitPerTurn: number; // seconds, 0 = no limit
}

export interface Move {
  id: string;
  playerId: PlayerId;
  pieceId: PieceId;
  diceValue: number;
  fromPosition: PiecePosition;
  toPosition: PiecePosition;
  capturedPieceId: PieceId | null;
  timestamp: number;
  isValid: boolean;
}

// ============================================
// Socket Events
// ============================================

export interface ServerToClientEvents {
  // Room events
  'room:created': (data: RoomCreatedData) => void;
  'room:joined': (data: RoomJoinedData) => void;
  'room:left': (data: RoomLeftData) => void;
  'room:player-joined': (data: PlayerJoinedData) => void;
  'room:player-left': (data: PlayerLeftData) => void;
  'room:error': (data: RoomErrorData) => void;
  'room:list': (data: RoomListData) => void;

  // Game events
  'game:started': (data: GameStartedData) => void;
  'game:state': (data: GameState) => void;
  'game:turn-changed': (data: TurnChangedData) => void;
  'game:dice-rolled': (data: DiceRolledData) => void;
  'game:piece-moved': (data: PieceMovedData) => void;
  'game:piece-captured': (data: PieceCapturedData) => void;
  'game:piece-entered-home': (data: PieceEnteredHomeData) => void;
  'game:piece-finished': (data: PieceFinishedData) => void;
  'game:won': (data: GameWonData) => void;
  'game:error': (data: GameErrorData) => void;

  // Connection events
  'connection:status': (data: ConnectionStatusData) => void;
  'player:reconnected': (data: PlayerReconnectedData) => void;
}

export interface ClientToServerEvents {
  // Room events
  'room:create': (data: CreateRoomData, callback: (response: CreateRoomResponse) => void) => void;
  'room:join': (data: JoinRoomData, callback: (response: JoinRoomResponse) => void) => void;
  'room:leave': (data: LeaveRoomData, callback: (response: LeaveRoomResponse) => void) => void;
  'room:list': (callback: (response: RoomListResponse) => void) => void;
  'room:update-settings': (data: UpdateRoomSettingsData, callback: (response: UpdateRoomSettingsResponse) => void) => void;

  // Game events
  'game:start': (data: StartGameData, callback: (response: StartGameResponse) => void) => void;
  'game:roll-dice': (callback: (response: RollDiceResponse) => void) => void;
  'game:move-piece': (data: MovePieceData, callback: (response: MovePieceResponse) => void) => void;
  'game:pass-turn': (callback: (response: PassTurnResponse) => void) => void;

  // Player events
  'player:update-name': (data: UpdateNameData, callback: (response: UpdateNameResponse) => void) => void;
  'player:ready': (data: PlayerReadyData, callback: (response: PlayerReadyResponse) => void) => void;
}

// Socket event data types
export interface RoomCreatedData {
  roomId: GameId;
  hostId: PlayerId;
  settings: GameSettings;
}

export interface RoomJoinedData {
  roomId: GameId;
  player: Player;
  players: Player[];
  settings: GameSettings;
}

export interface RoomLeftData {
  roomId: GameId;
  playerId: PlayerId;
}

export interface PlayerJoinedData {
  player: Player;
  players: Player[];
}

export interface PlayerLeftData {
  playerId: PlayerId;
  players: Player[];
}

export interface RoomErrorData {
  code: string;
  message: string;
}

export interface RoomListData {
  rooms: RoomSummary[];
}

export interface RoomSummary {
  id: GameId;
  hostName: string;
  playerCount: number;
  maxPlayers: number;
  phase: GamePhase;
  isPrivate: boolean;
  createdAt: number;
}

export interface GameStartedData {
  gameState: GameState;
}

export interface TurnChangedData {
  currentPlayerId: PlayerId;
  diceValue: number | null;
  canRoll: boolean;
}

export interface DiceRolledData {
  playerId: PlayerId;
  value: number;
  canMove: PieceId[];
}

export interface PieceMovedData {
  pieceId: PieceId;
  playerId: PlayerId;
  fromPosition: PiecePosition;
  toPosition: PiecePosition;
  diceValue: number;
}

export interface PieceCapturedData {
  capturedPieceId: PieceId;
  capturedPlayerId: PlayerId;
  capturingPieceId: PieceId;
  capturingPlayerId: PlayerId;
  position: PiecePosition;
}

export interface PieceEnteredHomeData {
  pieceId: PieceId;
  playerId: PlayerId;
  homeIndex: number;
}

export interface PieceFinishedData {
  pieceId: PieceId;
  playerId: PlayerId;
  piecesFinished: number;
}

export interface GameWonData {
  winnerId: PlayerId;
  winnerName: string;
  finalScores: Record<PlayerId, number>;
}

export interface GameErrorData {
  code: string;
  message: string;
}

export interface ConnectionStatusData {
  connected: boolean;
  playerId?: PlayerId;
}

export interface PlayerReconnectedData {
  playerId: PlayerId;
  gameState: GameState;
}

// Request/Response types
export interface CreateRoomData {
  playerName: string;
  settings?: Partial<GameSettings>;
  isPrivate?: boolean;
}

export interface CreateRoomResponse {
  success: boolean;
  roomId?: GameId;
  playerId?: PlayerId;
  error?: string;
}

export interface JoinRoomData {
  roomId: GameId;
  playerName: string;
}

export interface JoinRoomResponse {
  success: boolean;
  playerId?: PlayerId;
  error?: string;
}

export interface LeaveRoomData {
  roomId: GameId;
  playerId: PlayerId;
}

export interface LeaveRoomResponse {
  success: boolean;
  error?: string;
}

export interface RoomListResponse {
  success: boolean;
  rooms?: RoomSummary[];
  error?: string;
}

export interface UpdateRoomSettingsData {
  roomId: GameId;
  playerId: PlayerId;
  settings: Partial<GameSettings>;
}

export interface UpdateRoomSettingsResponse {
  success: boolean;
  error?: string;
}

export interface StartGameData {
  roomId: GameId;
  playerId: PlayerId;
}

export interface StartGameResponse {
  success: boolean;
  error?: string;
}

export interface RollDiceResponse {
  success: boolean;
  value?: number;
  canMove?: PieceId[];
  error?: string;
}

export interface MovePieceData {
  pieceId: PieceId;
}

export interface MovePieceResponse {
  success: boolean;
  error?: string;
}

export interface PassTurnResponse {
  success: boolean;
  error?: string;
}

export interface UpdateNameData {
  playerId: PlayerId;
  name: string;
}

export interface UpdateNameResponse {
  success: boolean;
  error?: string;
}

export interface PlayerReadyData {
  playerId: PlayerId;
  ready: boolean;
}

export interface PlayerReadyResponse {
  success: boolean;
  error?: string;
}

// ============================================
// UI State Types
// ============================================

export interface UIState {
  currentScreen: 'landing' | 'lobby' | 'game' | 'settings';
  selectedPieceId: PieceId | null;
  validMoves: PieceId[];
  showRules: boolean;
  showSettings: boolean;
  animationsEnabled: boolean;
  soundEnabled: boolean;
  theme: 'dark' | 'light' | 'system';
}

export interface BoardCellProps {
  index: number;
  row: number;
  col: number;
  pieces: Piece[];
  isSafeZone: boolean;
  isStartPosition: PlayerColor | null;
  isHomeEntry: PlayerColor | null;
  isHomePath: PlayerColor | null;
  highlight: boolean;
  onClick: (index: number) => void;
}

export interface PieceProps {
  piece: Piece;
  position: { x: number; y: number };
  size: number;
  isSelected: boolean;
  isMovable: boolean;
  isCurrentPlayer: boolean;
  onClick: (pieceId: PieceId) => void;
}

export interface DiceProps {
  value: number;
  rolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  disabled?: boolean;
}

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}