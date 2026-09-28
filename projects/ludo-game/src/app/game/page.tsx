'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Dices, Users, Crown, X, RotateCcw, Volume2, VolumeX, Settings, Home } from 'lucide-react';
import { useRoom, useGame } from '@/lib/socket/client';
import { GameBoard } from '@/components/board/GameBoard';
import { Dice as DiceComponent } from '@/components/dice/Dice';
import { PlayerInfo, TurnIndicator, GameStatus } from '@/components/players/PlayerComponents';
import { Piece } from '@/types/game';

export default function GamePage() {
  const router = useRouter();
  
  const { 
    connected, 
    currentRoomId, 
    players, 
    currentPlayer, 
    leaveRoom 
  } = useRoom();
  
  const { 
    gameState, 
    currentTurn, 
    diceValue, 
    canRoll, 
    movablePieces, 
    winner,
    rollDice, 
    movePiece, 
    passTurn 
  } = useGame();

  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [statusType, setStatusType] = useState<'info' | 'success' | 'error' | 'warning'>('info');

  // Get all pieces from all players
  const allPieces = players.flatMap(p => p.pieces || []);
  
  // Current player's pieces
  const myPieces = currentPlayer?.pieces || [];
  
  // Check if it's my turn
  const isMyTurn = currentTurn === currentPlayer?.id;
  
  // Get valid moves for selected piece
  const validMoves = movablePieces.includes(selectedPieceId || '') ? movablePieces : [];

  // Handle piece selection
  const handlePieceClick = useCallback((pieceId: string) => {
    const piece = allPieces.find(p => p.id === pieceId);
    if (!piece || piece.playerId !== currentPlayer?.id) return;
    
    if (selectedPieceId === pieceId) {
      setSelectedPieceId(null);
    } else if (movablePieces.includes(pieceId)) {
      setSelectedPieceId(pieceId);
    }
  }, [selectedPieceId, movablePieces, allPieces, currentPlayer?.id]);

  // Handle cell click (for moving to home path, etc.)
  const handleCellClick = useCallback((index: number | string) => {
    // Could implement click-to-move for home path
  }, []);

  // Handle dice roll
  const handleRollDice = useCallback(async () => {
    if (!isMyTurn || diceValue || !canRoll) return;
    
    try {
      const result = await rollDice();
      if (result.success && result.value) {
        setStatusMessage(`You rolled a ${result.value}!`);
        setStatusType('success');
        
        if (result.canMove && result.canMove.length === 0) {
          setTimeout(() => {
            setStatusMessage('No valid moves. Turn passes...');
            setStatusType('warning');
          }, 1500);
        }
      } else {
        setStatusMessage(result.error || 'Failed to roll dice');
        setStatusType('error');
      }
    } catch (err) {
      setStatusMessage('Error rolling dice');
      setStatusType('error');
    }
  }, [isMyTurn, diceValue, canRoll, rollDice]);

  // Handle piece move
  const handleMovePiece = useCallback(async (pieceId: string) => {
    if (!isMyTurn) return;
    
    try {
      const result = await movePiece(pieceId);
      if (result.success) {
        setSelectedPieceId(null);
        setStatusMessage('Piece moved!');
        setStatusType('success');
      } else {
        setStatusMessage(result.error || 'Invalid move');
        setStatusType('error');
      }
    } catch (err) {
      setStatusMessage('Error moving piece');
      setStatusType('error');
    }
  }, [isMyTurn, movePiece]);

  // Handle pass turn
  const handlePassTurn = useCallback(async () => {
    if (!isMyTurn || diceValue === null) return;
    
    try {
      const result = await passTurn();
      if (result.success) {
        setSelectedPieceId(null);
        setStatusMessage('Turn passed');
        setStatusType('info');
      }
    } catch (err) {
      setStatusMessage('Error passing turn');
      setStatusType('error');
    }
  }, [isMyTurn, diceValue, passTurn]);

  // Handle winner
  useEffect(() => {
    if (winner) {
      const winnerPlayer = players.find(p => p.id === winner);
      const isWinner = winner === currentPlayer?.id;
      setStatusMessage(
        isWinner 
          ? '🎉 Congratulations! You won!' 
          : `Game over! ${winnerPlayer?.name} won!`
      );
      setStatusType(isWinner ? 'success' : 'info');
    }
  }, [winner, players, currentPlayer?.id]);

  // Handle disconnection
  useEffect(() => {
    if (!connected && currentRoomId) {
      setStatusMessage('Disconnected. Attempting to reconnect...');
      setStatusType('warning');
    }
  }, [connected, currentRoomId]);

  // If not in a room, redirect to lobby
  if (!currentRoomId) {
    useEffect(() => {
      router.push('/lobby');
    }, [router]);
    return null;
  }

  // Determine current player info for turn indicator
  const turnPlayer = players.find(p => p.id === currentTurn);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="game-card px-4 py-3 flex items-center justify-between border-b border-ludo-surface-800">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (confirm('Leave the game?')) leaveRoom(currentRoomId!, currentPlayer!.id);
            }}
            className="btn-secondary px-3 py-1.5 text-sm flex items-center gap-1"
          >
            <Home className="w-4 h-4" />
            <span className="hidden sm:inline">Leave</span>
          </button>
          <div>
            <h1 className="text-heading-md font-bold text-gradient">Room {currentRoomId}</h1>
            <p className="text-body-xs text-ludo-surface-500">
              {winner ? 'Game Finished' : isMyTurn ? 'Your Turn' : `${turnPlayer?.name}'s Turn`}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="btn-secondary p-2"
            aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setAnimationsEnabled(!animationsEnabled)}
            className="btn-secondary p-2"
            aria-label={animationsEnabled ? 'Disable animations' : 'Enable animations'}
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="btn-secondary p-2"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Side - Board */}
        <div className="flex-1 p-4 lg:p-6 min-w-0">
          <div className="h-full max-w-full flex flex-col items-center justify-center">
            <GameBoard
              pieces={allPieces}
              currentPlayerId={currentPlayer?.id || null}
              selectedPieceId={selectedPieceId}
              movablePieceIds={movablePieces}
              diceValue={diceValue}
              onPieceClick={handlePieceClick}
              onCellClick={handleCellClick}
            />
          </div>
        </div>

        {/* Right Side - Controls & Players */}
        <div className="w-full lg:w-80 flex flex-col gap-4 p-4 lg:p-6 border-l border-ludo-surface-800 bg-ludo-surface-900/50">
          {/* Dice & Turn */}
          <TurnIndicator
            currentPlayer={turnPlayer || null}
            diceValue={diceValue}
            canRoll={canRoll && isMyTurn}
            onRollDice={handleRollDice}
            rolling={false}
          />

          {/* Pass Turn Button */}
          {isMyTurn && diceValue !== null && movablePieces.length === 0 && (
            <motion.button
              onClick={handlePassTurn}
              className="btn-secondary w-full py-3"
              whileTap={{ scale: 0.97 }}
            >
              Pass Turn
            </motion.button>
          )}

          {/* Status Message */}
          <AnimatePresence mode="wait">
            {statusMessage && (
              <motion.div
                key={statusMessage}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="w-full"
              >
                <GameStatus message={statusMessage} type={statusType} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Players Panel */}
          <div className="flex-1 overflow-y-auto">
            <h2 className="text-heading-sm font-bold mb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-ludo-gold" />
              Players
            </h2>
            <div className="space-y-2">
              {players.map((player) => (
                <PlayerInfo
                  key={player.id}
                  player={player}
                  isCurrentTurn={player.id === currentTurn}
                  pieces={player.pieces || []}
                />
              ))}
            </div>
          </div>

          {/* Winner Display */}
          {winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="game-card p-4 text-center"
              style={{ background: 'linear-gradient(135deg, var(--ludo-gold)/20, var(--ludo-yellow-500)/10)' }}
            >
              <Crown className="w-12 h-12 text-ludo-gold mx-auto mb-2" />
              <p className="text-heading-sm font-bold text-ludo-surface-100">
                {winner === currentPlayer?.id ? 'You Won!' : `${players.find(p => p.id === winner)?.name} Won!`}
              </p>
              <button
                onClick={() => leaveRoom(currentRoomId!, currentPlayer!.id)}
                className="btn-primary mt-4 w-full"
              >
                Return to Lobby
              </button>
            </motion.div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={() => setShowSettings(false)}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="game-card w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-heading-md font-bold">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="btn-secondary p-2"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-ludo-surface-600 bg-ludo-surface-800 text-ludo-accent focus:ring-ludo-accent"
                />
                <span className="text-body-md">Sound Effects</span>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={animationsEnabled}
                  onChange={(e) => setAnimationsEnabled(e.target.checked)}
                  className="w-5 h-5 rounded border-ludo-surface-600 bg-ludo-surface-800 text-ludo-accent focus:ring-ludo-accent"
                />
                <span className="text-body-md">Animations</span>
              </label>
              
              <div className="pt-4 border-t border-ludo-surface-700">
                <button
                  onClick={() => {
                    leaveRoom(currentRoomId!, currentPlayer!.id);
                    setShowSettings(false);
                  }}
                  className="btn-secondary w-full py-3"
                >
                  Leave Game
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}