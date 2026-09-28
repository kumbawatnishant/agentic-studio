/**
 * Socket.io Server for Ludo Game
 * Handles real-time multiplayer game rooms and game state synchronization
 */

import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import { LudoGameEngine, createGameEngine } from '@/lib/game/engine';
import {
  ServerToClientEvents,
  ClientToServerEvents,
  Player,
  GameState,
  GameSettings,
  GamePhase,
  RoomSummary,
  CreateRoomData,
  CreateRoomResponse,
  JoinRoomData,
  JoinRoomResponse,
  LeaveRoomData,
  LeaveRoomResponse,
  RoomListResponse,
  UpdateRoomSettingsData,
  UpdateRoomSettingsResponse,
  StartGameData,
  StartGameResponse,
  RollDiceResponse,
  MovePieceData,
  MovePieceResponse,
  PassTurnResponse,
  UpdateNameData,
  UpdateNameResponse,
  PlayerReadyData,
  PlayerReadyResponse,
} from '@/types/game';

// ============================================
// Room Management
// ============================================

interface GameRoom {
  id: string;
  hostId: string;
  players: Map<string, Player>;
  gameEngine: LudoGameEngine;
  settings: GameSettings;
  phase: GamePhase;
  createdAt: number;
  spectatorIds: Set<string>;
}

const rooms = new Map<string, GameRoom>();
const playerSockets = new Map<string, Socket>(); // playerId -> socket
const socketPlayers = new Map<string, string>(); // socketId -> playerId

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function createRoom(hostName: string, settings?: Partial<GameSettings>, isPrivate = false): GameRoom {
  const roomId = generateRoomCode();
  const engine = createGameEngine(settings);
  
  const hostPlayer = engine.addPlayer(hostName, 'red', true);
  
  const room: GameRoom = {
    id: roomId,
    hostId: hostPlayer.id,
    players: new Map([[hostPlayer.id, hostPlayer]]),
    gameEngine: engine,
    settings: engine.getState().settings,
    phase: 'waiting',
    createdAt: Date.now(),
    spectatorIds: new Set(),
  };
  
  rooms.set(roomId, room);
  return room;
}

function getRoomSummary(room: GameRoom): RoomSummary {
  return {
    id: room.id,
    hostName: room.players.get(room.hostId)?.name || 'Unknown',
    playerCount: room.players.size,
    maxPlayers: room.settings.maxPlayers,
    phase: room.phase,
    isPrivate: room.settings.privateRoom,
    createdAt: room.createdAt,
  };
}

// ============================================
// Socket Event Handlers
// ============================================

export function setupSocketServer(httpServer: HttpServer): Server {
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket: Socket<ClientToServerEvents, ServerToClientEvents>) => {
    console.log(`Client connected: ${socket.id}`);

    // ============================================
    // Room Events
    // ============================================
    
    socket.on('room:create', (data: CreateRoomData, callback) => {
      try {
        const room = createRoom(data.playerName, data.settings, data.isPrivate);
        const hostPlayer = room.players.get(room.hostId)!;
        
        socket.join(room.id);
        playerSockets.set(hostPlayer.id, socket);
        socketPlayers.set(socket.id, hostPlayer.id);
        
        const response: CreateRoomResponse = {
          success: true,
          roomId: room.id,
          playerId: hostPlayer.id,
        };
        
        socket.emit('room:created', {
          roomId: room.id,
          hostId: hostPlayer.id,
          settings: room.settings,
        });
        
        callback(response);
      } catch (error) {
        console.error('Error creating room:', error);
        callback({ success: false, error: 'Failed to create room' });
      }
    });

    socket.on('room:join', (data: JoinRoomData, callback) => {
      try {
        const room = rooms.get(data.roomId.toUpperCase());
        
        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }
        
        if (room.phase !== 'waiting') {
          callback({ success: false, error: 'Game already in progress' });
          return;
        }
        
        if (room.players.size >= room.settings.maxPlayers) {
          callback({ success: false, error: 'Room is full' });
          return;
        }
        
        // Assign color based on available colors
        const usedColors = new Set(Array.from(room.players.values()).map(p => p.color));
        const availableColors: ('red' | 'blue' | 'green' | 'yellow')[] = ['red', 'blue', 'green', 'yellow']
          .filter(c => !usedColors.has(c));
        
        if (availableColors.length === 0) {
          callback({ success: false, error: 'No available colors' });
          return;
        }
        
        const color = availableColors[0];
        const player = room.gameEngine.addPlayer(data.playerName, color);
        
        room.players.set(player.id, player);
        
        socket.join(room.id);
        playerSockets.set(player.id, socket);
        socketPlayers.set(socket.id, player.id);
        
        // Notify room about new player
        io.to(room.id).emit('room:player-joined', {
          player,
          players: Array.from(room.players.values()),
        });
        
        const response: JoinRoomResponse = {
          success: true,
          playerId: player.id,
        };
        
        socket.emit('room:joined', {
          roomId: room.id,
          player,
          players: Array.from(room.players.values()),
          settings: room.settings,
        });
        
        callback(response);
      } catch (error) {
        console.error('Error joining room:', error);
        callback({ success: false, error: 'Failed to join room' });
      }
    });

    socket.on('room:leave', (data: LeaveRoomData, callback) => {
      try {
        const room = rooms.get(data.roomId);
        
        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }
        
        const player = room.players.get(data.playerId);
        if (!player) {
          callback({ success: false, error: 'Player not in room' });
          return;
        }
        
        const wasHost = player.id === room.hostId;
        room.players.delete(data.playerId);
        playerSockets.delete(data.playerId);
        
        socket.leave(room.id);
        socketPlayers.delete(socket.id);
        
        // Notify remaining players
        io.to(room.id).emit('room:player-left', {
          playerId: data.playerId,
          players: Array.from(room.players.values()),
        });
        
        // If host left, assign new host or close room
        if (wasHost && room.players.size > 0) {
          const newHost = room.players.values().next().value;
          if (newHost) {
            newHost.isHost = true;
            room.hostId = newHost.id;
          }
        }
        
        // Clean up empty rooms
        if (room.players.size === 0) {
          rooms.delete(room.id);
        }
        
        const response: LeaveRoomResponse = { success: true };
        callback(response);
      } catch (error) {
        console.error('Error leaving room:', error);
        callback({ success: false, error: 'Failed to leave room' });
      }
    });

    socket.on('room:list', (callback) => {
      const roomList = Array.from(rooms.values())
        .filter(r => !r.settings.privateRoom && r.phase === 'waiting')
        .map(getRoomSummary);
      
      callback({ success: true, rooms: roomList });
    });

    socket.on('room:update-settings', (data: UpdateRoomSettingsData, callback) => {
      try {
        const room = rooms.get(data.roomId);
        
        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }
        
        if (room.hostId !== data.playerId) {
          callback({ success: false, error: 'Only host can update settings' });
          return;
        }
        
        if (room.phase !== 'waiting') {
          callback({ success: false, error: 'Cannot update settings during game' });
          return;
        }
        
        room.settings = { ...room.settings, ...data.settings };
        room.gameEngine = createGameEngine(room.settings);
        
        // Re-add players to new engine
        for (const player of room.players.values()) {
          const newPlayer = room.gameEngine.addPlayer(player.name, player.color, player.isHost);
          room.players.set(newPlayer.id, newPlayer);
        }
        
        io.to(room.id).emit('room:player-joined', {
          player: room.players.get(room.hostId)!,
          players: Array.from(room.players.values()),
        });
        
        callback({ success: true });
      } catch (error) {
        console.error('Error updating settings:', error);
        callback({ success: false, error: 'Failed to update settings' });
      }
    });

    // ============================================
    // Game Events
    // ============================================
    
    socket.on('game:start', (data: StartGameData, callback) => {
      try {
        const room = rooms.get(data.roomId);
        
        if (!room) {
          callback({ success: false, error: 'Room not found' });
          return;
        }
        
        if (room.hostId !== data.playerId) {
          callback({ success: false, error: 'Only host can start game' });
          return;
        }
        
        if (room.players.size < 2) {
          callback({ success: false, error: 'Need at least 2 players' });
          return;
        }
        
        if (room.phase !== 'waiting') {
          callback({ success: false, error: 'Game already started' });
          return;
        }
        
        const started = room.gameEngine.startGame();
        if (!started) {
          callback({ success: false, error: 'Failed to start game' });
          return;
        }
        
        room.phase = 'playing';
        
        const gameState = room.gameEngine.getState();
        
        io.to(room.id).emit('game:started', { gameState });
        io.to(room.id).emit('game:state', gameState);
        
        // Notify first player it's their turn
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer) {
          io.to(room.id).emit('game:turn-changed', {
            currentPlayerId: currentPlayer.id,
            diceValue: null,
            canRoll: true,
          });
        }
        
        callback({ success: true });
      } catch (error) {
        console.error('Error starting game:', error);
        callback({ success: false, error: 'Failed to start game' });
      }
    });

    socket.on('game:roll-dice', (callback) => {
      try {
        const playerId = socketPlayers.get(socket.id);
        if (!playerId) {
          callback({ success: false, error: 'Not in a game' });
          return;
        }
        
        // Find player's room
        let room: GameRoom | undefined;
        for (const r of rooms.values()) {
          if (r.players.has(playerId)) {
            room = r;
            break;
          }
        }
        
        if (!room || room.phase !== 'playing') {
          callback({ success: false, error: 'Game not in progress' });
          return;
        }
        
        const gameState = room.gameEngine.getState();
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        
        if (!currentPlayer || currentPlayer.id !== playerId) {
          callback({ success: false, error: 'Not your turn' });
          return;
        }
        
        if (gameState.diceValue !== null) {
          callback({ success: false, error: 'Already rolled, move a piece first' });
          return;
        }
        
        const value = room.gameEngine.rollDice();
        const movablePieces = room.gameEngine.getMovablePieces(playerId);
        
        const updatedState = room.gameEngine.getState();
        io.to(room.id).emit('game:state', updatedState);
        io.to(room.id).emit('game:dice-rolled', {
          playerId,
          value,
          canMove: movablePieces.map(p => p.id),
        });
        
        callback({ success: true, value, canMove: movablePieces.map(p => p.id) });
      } catch (error) {
        console.error('Error rolling dice:', error);
        callback({ success: false, error: 'Failed to roll dice' });
      }
    });

    socket.on('game:move-piece', (data: MovePieceData, callback) => {
      try {
        const playerId = socketPlayers.get(socket.id);
        if (!playerId) {
          callback({ success: false, error: 'Not in a game' });
          return;
        }
        
        let room: GameRoom | undefined;
        for (const r of rooms.values()) {
          if (r.players.has(playerId)) {
            room = r;
            break;
          }
        }
        
        if (!room || room.phase !== 'playing') {
          callback({ success: false, error: 'Game not in progress' });
          return;
        }
        
        const move = room.gameEngine.movePiece(data.pieceId);
        
        if (!move) {
          callback({ success: false, error: 'Invalid move' });
          return;
        }
        
        const updatedState = room.gameEngine.getState();
        io.to(room.id).emit('game:state', updatedState);
        io.to(room.id).emit('game:piece-moved', {
          pieceId: move.pieceId,
          playerId: move.playerId,
          fromPosition: move.fromPosition,
          toPosition: move.toPosition,
          diceValue: move.diceValue,
        });
        
        if (move.capturedPieceId) {
          io.to(room.id).emit('game:piece-captured', {
            capturedPieceId: move.capturedPieceId,
            capturedPlayerId: room.gameEngine.getPiece(move.capturedPieceId!)?.playerId || '',
            capturingPieceId: move.pieceId,
            capturingPlayerId: move.playerId,
            position: move.toPosition,
          });
        }
        
        // Check for win
        if (updatedState.phase === 'finished' && updatedState.winner) {
          const winner = room.players.get(updatedState.winner);
          io.to(room.id).emit('game:won', {
            winnerId: updatedState.winner,
            winnerName: winner?.name || 'Unknown',
            finalScores: {}, // Could calculate scores here
          });
        } else {
          // Next turn
          const currentPlayer = updatedState.players[updatedState.currentPlayerIndex];
          if (currentPlayer) {
            io.to(room.id).emit('game:turn-changed', {
              currentPlayerId: currentPlayer.id,
              diceValue: null,
              canRoll: true,
            });
          }
        }
        
        callback({ success: true });
      } catch (error) {
        console.error('Error moving piece:', error);
        callback({ success: false, error: 'Failed to move piece' });
      }
    });

    socket.on('game:pass-turn', (callback) => {
      try {
        const playerId = socketPlayers.get(socket.id);
        if (!playerId) {
          callback({ success: false, error: 'Not in a game' });
          return;
        }
        
        let room: GameRoom | undefined;
        for (const r of rooms.values()) {
          if (r.players.has(playerId)) {
            room = r;
            break;
          }
        }
        
        if (!room || room.phase !== 'playing') {
          callback({ success: false, error: 'Game not in progress' });
          return;
        }
        
        const passed = room.gameEngine.passTurn();
        
        if (!passed) {
          callback({ success: false, error: 'Cannot pass turn' });
          return;
        }
        
        const updatedState = room.gameEngine.getState();
        io.to(room.id).emit('game:state', updatedState);
        
        const currentPlayer = updatedState.players[updatedState.currentPlayerIndex];
        if (currentPlayer) {
          io.to(room.id).emit('game:turn-changed', {
            currentPlayerId: currentPlayer.id,
            diceValue: null,
            canRoll: true,
          });
        }
        
        callback({ success: true });
      } catch (error) {
        console.error('Error passing turn:', error);
        callback({ success: false, error: 'Failed to pass turn' });
      }
    });

    // ============================================
    // Player Events
    // ============================================
    
    socket.on('player:update-name', (data: UpdateNameData, callback) => {
      try {
        let room: GameRoom | undefined;
        for (const r of rooms.values()) {
          if (r.players.has(data.playerId)) {
            room = r;
            break;
          }
        }
        
        if (!room) {
          callback({ success: false, error: 'Player not found' });
          return;
        }
        
        const player = room.players.get(data.playerId);
        if (player) {
          player.name = data.name;
          io.to(room.id).emit('room:player-joined', {
            player,
            players: Array.from(room.players.values()),
          });
        }
        
        callback({ success: true });
      } catch (error) {
        console.error('Error updating name:', error);
        callback({ success: false, error: 'Failed to update name' });
      }
    });

    // ============================================
    // Disconnection Handling
    // ============================================
    
    socket.on('disconnect', (reason) => {
      console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
      
      const playerId = socketPlayers.get(socket.id);
      if (playerId) {
        playerSockets.delete(playerId);
        socketPlayers.delete(socket.id);
        
        // Find and handle room
        for (const [roomId, room] of rooms.entries()) {
          if (room.players.has(playerId)) {
            const player = room.players.get(playerId)!;
            player.isConnected = false;
            
            io.to(roomId).emit('room:player-left', {
              playerId,
              players: Array.from(room.players.values()),
            });
            
            // If game in progress, don't remove player immediately
            // Allow reconnection within a grace period
            if (room.phase === 'waiting') {
              room.players.delete(playerId);
              
              if (room.players.size === 0) {
                rooms.delete(roomId);
              } else if (player.id === room.hostId) {
                const newHost = room.players.values().next().value;
                if (newHost) {
                  newHost.isHost = true;
                  room.hostId = newHost.id;
                }
              }
            }
            break;
          }
        }
      }
    });
  });

  // Periodic cleanup of stale rooms
  setInterval(() => {
    const now = Date.now();
    const MAX_ROOM_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    for (const [roomId, room] of rooms.entries()) {
      if (room.phase === 'waiting' && now - room.createdAt > MAX_ROOM_AGE) {
        rooms.delete(roomId);
        console.log(`Cleaned up stale room: ${roomId}`);
      }
    }
  }, 60 * 60 * 1000); // Run every hour

  return io;
}

// ============================================
// Export for external use
// ============================================

export { rooms, getRoomSummary };