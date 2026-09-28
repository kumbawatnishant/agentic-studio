/**
 * Socket.io Client Hook
 * Provides React hooks for connecting to the game server
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  Player,
  GameState,
  RoomSummary,
  CreateRoomData,
  CreateRoomResponse,
  JoinRoomData,
  JoinRoomResponse,
  LeaveRoomResponse,
  RoomListResponse,
  StartGameResponse,
  RollDiceResponse,
  MovePieceResponse,
  PassTurnResponse,
  UpdateNameResponse,
} from '@/types/game';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    const socket: TypedSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      setConnected(true);
      setConnectionError(null);
    });

    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
      setConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnectionError(error.message);
      setConnected(false);
    });

    socket.on('connection:status', (data) => {
      setConnected(data.connected);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  const emit = useCallback(<K extends keyof ClientToServerEvents>(
    event: K,
    data: Parameters<ClientToServerEvents[K]>[0],
    callback?: Parameters<ClientToServerEvents[K]>[1]
  ) => {
    socketRef.current?.emit(event, data, callback as any);
  }, []);

  const on = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler: ServerToClientEvents[K]
  ) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback(<K extends keyof ServerToClientEvents>(
    event: K,
    handler?: ServerToClientEvents[K]
  ) => {
    socketRef.current?.off(event, handler);
  }, []);

  return {
    socket: socketRef.current,
    connected,
    connectionError,
    emit,
    on,
    off,
  };
}

// ============================================
// Room Hooks
// ============================================

export function useRoom() {
  const { emit, on, off, connected } = useSocket();
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [roomSettings, setRoomSettings] = useState<any>(null);
  const [roomPhase, setRoomPhase] = useState<'waiting' | 'playing' | 'finished'>('waiting');
  const [roomsList, setRoomsList] = useState<RoomSummary[]>([]);

  useEffect(() => {
    const handleCreated = (data: any) => {
      setCurrentRoomId(data.roomId);
      setRoomSettings(data.settings);
      setRoomPhase('waiting');
    };

    const handleJoined = (data: any) => {
      setCurrentRoomId(data.roomId);
      setCurrentPlayer(data.player);
      setPlayers(data.players);
      setRoomSettings(data.settings);
      setRoomPhase('waiting');
    };

    const handlePlayerJoined = (data: any) => {
      setPlayers(data.players);
      if (data.player.id === currentPlayer?.id) {
        setCurrentPlayer(data.player);
      }
    };

    const handlePlayerLeft = (data: any) => {
      setPlayers(data.players);
    };

    const handleError = (data: any) => {
      console.error('Room error:', data);
    };

    on('room:created', handleCreated);
    on('room:joined', handleJoined);
    on('room:player-joined', handlePlayerJoined);
    on('room:player-left', handlePlayerLeft);
    on('room:error', handleError);

    return () => {
      off('room:created', handleCreated);
      off('room:joined', handleJoined);
      off('room:player-joined', handlePlayerJoined);
      off('room:player-left', handlePlayerLeft);
      off('room:error', handleError);
    };
  }, [on, off, currentPlayer]);

  const createRoom = useCallback((data: CreateRoomData): Promise<CreateRoomResponse> => {
    return new Promise((resolve) => {
      emit('room:create', data, resolve);
    });
  }, [emit]);

  const joinRoom = useCallback((data: JoinRoomData): Promise<JoinRoomResponse> => {
    return new Promise((resolve) => {
      emit('room:join', data, resolve);
    });
  }, [emit]);

  const leaveRoom = useCallback((roomId: string, playerId: string): Promise<LeaveRoomResponse> => {
    return new Promise((resolve) => {
      emit('room:leave', { roomId, playerId }, resolve);
      setCurrentRoomId(null);
      setPlayers([]);
      setCurrentPlayer(null);
      setRoomSettings(null);
      setRoomPhase('waiting');
    });
  }, [emit]);

  const listRooms = useCallback((): Promise<RoomListResponse> => {
    return new Promise((resolve) => {
      emit('room:list', undefined, resolve);
    });
  }, [emit]);

  const updateSettings = useCallback((roomId: string, playerId: string, settings: any) => {
    emit('room:update-settings', { roomId, playerId, settings });
  }, [emit]);

  return {
    currentRoomId,
    players,
    currentPlayer,
    roomSettings,
    roomPhase,
    roomsList,
    createRoom,
    joinRoom,
    leaveRoom,
    listRooms,
    updateSettings,
    connected,
  };
}

// ============================================
// Game Hooks
// ============================================

export function useGame() {
  const { emit, on, off } = useSocket();
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentTurn, setCurrentTurn] = useState<string | null>(null);
  const [diceValue, setDiceValue] = useState<number | null>(null);
  const [canRoll, setCanRoll] = useState(false);
  const [movablePieces, setMovablePieces] = useState<string[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  useEffect(() => {
    const handleStarted = (data: any) => {
      setGameState(data.gameState);
    };

    const handleState = (state: GameState) => {
      setGameState(state);
    };

    const handleTurnChanged = (data: any) => {
      setCurrentTurn(data.currentPlayerId);
      setCanRoll(data.canRoll);
      setDiceValue(data.diceValue);
    };

    const handleDiceRolled = (data: any) => {
      setDiceValue(data.value);
      setCanRoll(false);
      setMovablePieces(data.canMove);
    };

    const handlePieceMoved = (data: any) => {
      // State will be updated via handleState
    };

    const handlePieceCaptured = (data: any) => {
      // Could show animation/notification
    };

    const handleWon = (data: any) => {
      setWinner(data.winnerId);
      setCanRoll(false);
    };

    const handleError = (data: any) => {
      console.error('Game error:', data);
    };

    on('game:started', handleStarted);
    on('game:state', handleState);
    on('game:turn-changed', handleTurnChanged);
    on('game:dice-rolled', handleDiceRolled);
    on('game:piece-moved', handlePieceMoved);
    on('game:piece-captured', handlePieceCaptured);
    on('game:won', handleWon);
    on('game:error', handleError);

    return () => {
      off('game:started', handleStarted);
      off('game:state', handleState);
      off('game:turn-changed', handleTurnChanged);
      off('game:dice-rolled', handleDiceRolled);
      off('game:piece-moved', handlePieceMoved);
      off('game:piece-captured', handlePieceCaptured);
      off('game:won', handleWon);
      off('game:error', handleError);
    };
  }, [on, off]);

  const startGame = useCallback((roomId: string, playerId: string): Promise<StartGameResponse> => {
    return new Promise((resolve) => {
      emit('game:start', { roomId, playerId }, resolve);
    });
  }, [emit]);

  const rollDice = useCallback((): Promise<RollDiceResponse> => {
    return new Promise((resolve) => {
      emit('game:roll-dice', undefined, resolve);
    });
  }, [emit]);

  const movePiece = useCallback((pieceId: string): Promise<MovePieceResponse> => {
    return new Promise((resolve) => {
      emit('game:move-piece', { pieceId }, resolve);
    });
  }, [emit]);

  const passTurn = useCallback((): Promise<PassTurnResponse> => {
    return new Promise((resolve) => {
      emit('game:pass-turn', undefined, resolve);
    });
  }, [emit]);

  const updateName = useCallback((playerId: string, name: string): Promise<UpdateNameResponse> => {
    return new Promise((resolve) => {
      emit('player:update-name', { playerId, name }, resolve);
    });
  }, [emit]);

  return {
    gameState,
    currentTurn,
    diceValue,
    canRoll,
    movablePieces,
    winner,
    startGame,
    rollDice,
    movePiece,
    passTurn,
    updateName,
  };
}