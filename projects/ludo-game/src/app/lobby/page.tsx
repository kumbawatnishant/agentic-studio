'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Dices, Users, Plus, Lock, ArrowLeft, Copy, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useRoom, useGame } from '@/lib/socket/client';
import { PlayerInfo } from '@/components/players/PlayerComponents';

export default function LobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  
  const { 
    connected, 
    currentRoomId, 
    players, 
    currentPlayer, 
    roomSettings, 
    roomPhase,
    createRoom, 
    joinRoom, 
    leaveRoom,
    startGame,
    updateName,
  } = useRoom();

  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);

  // Generate random name if empty
  useEffect(() => {
    if (!playerName) {
      const adjectives = ['Swift', 'Clever', 'Bold', 'Keen', 'Sharp', 'Wise', 'Grand', 'Noble'];
      const nouns = ['Tiger', 'Eagle', 'Lion', 'Fox', 'Hawk', 'Bear', 'Wolf', 'Shark'];
      const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
      const noun = nouns[Math.floor(Math.random() * nouns.length)];
      const num = Math.floor(Math.random() * 100);
      setPlayerName(`${adj}${noun}${num}`);
    }
  }, [playerName]);

  // Check if we should auto-create or auto-join
  useEffect(() => {
    if (mode === 'create' && !currentRoomId && connected) {
      handleCreateRoom();
    }
  }, [mode, connected, currentRoomId]);

  const handleCreateRoom = async () => {
    if (!playerName.trim()) {
      setError('Please enter a name');
      return;
    }
    
    setCreating(true);
    setError(null);
    
    try {
      const result = await createRoom({
        playerName: playerName.trim(),
        settings: {
          maxPlayers: 4,
          allowSpectators: false,
          privateRoom: false,
          winCondition: 'all-pieces',
          timeLimitPerTurn: 30,
        },
        isPrivate: false,
      });
      
      if (result.success) {
        // Room created successfully, socket events will update state
      } else {
        setError(result.error || 'Failed to create room');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async () => {
    if (!playerName.trim() || !joinCode.trim()) {
      setError('Please enter your name and room code');
      return;
    }
    
    setJoining(true);
    setError(null);
    
    try {
      const result = await joinRoom({
        roomId: joinCode.trim().toUpperCase(),
        playerName: playerName.trim(),
      });
      
      if (result.success) {
        setShowJoinModal(false);
        setJoinCode('');
      } else {
        setError(result.error || 'Failed to join room');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setJoining(false);
    }
  };

  const handleStartGame = async () => {
    if (!currentRoomId || !currentPlayer) return;
    
    try {
      const result = await startGame(currentRoomId, currentPlayer.id);
      if (!result.success) {
        setError(result.error || 'Failed to start game');
      }
      // Navigation to game page will happen via socket event
    } catch (err) {
      setError('Failed to start game');
    }
  };

  const handleLeaveRoom = async () => {
    if (!currentRoomId || !currentPlayer) return;
    
    try {
      await leaveRoom(currentRoomId, currentPlayer.id);
      router.push('/');
    } catch (err) {
      setError('Failed to leave room');
    }
  };

  const copyRoomCode = () => {
    if (currentRoomId) {
      navigator.clipboard.writeText(currentRoomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If in a room, show lobby
  if (currentRoomId) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="game-card px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLeaveRoom}
              className="btn-secondary px-4 py-2"
              disabled={creating || joining}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Leave
            </button>
            <div>
              <h1 className="text-heading-lg font-bold text-gradient">Room {currentRoomId}</h1>
              <p className="text-body-sm text-ludo-surface-500">
                {roomPhase === 'waiting' ? 'Waiting for players...' : 'Game in progress'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={copyRoomCode}
              className="btn-secondary px-4 py-2 flex items-center gap-2"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Copied!' : 'Copy Code'}
            </button>
            {currentPlayer?.isHost && roomPhase === 'waiting' && players.length >= 2 && (
              <motion.button
                onClick={handleStartGame}
                className="btn-primary px-6 py-2 flex items-center gap-2"
                whileTap={{ scale: 0.97 }}
              >
                <Dices className="w-4 h-4" />
                Start Game
              </motion.button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {/* Players List */}
            <section className="mb-8">
              <h2 className="text-heading-md font-bold mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-ludo-gold" />
                Players ({players.length}/4)
              </h2>
              
              <div className="grid gap-4">
                {players.map((player, index) => (
                  <PlayerInfo
                    key={player.id}
                    player={player}
                    isCurrentTurn={false}
                    pieces={player.pieces || []}
                    onClick={currentPlayer?.isHost && player.id !== currentPlayer.id ? () => {} : undefined}
                  />
                ))}
                
                {players.length < 4 && roomPhase === 'waiting' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="game-card p-6 text-center border-dashed border-ludo-surface-600"
                  >
                    <Plus className="w-12 h-12 text-ludo-surface-500 mx-auto mb-3" />
                    <p className="text-ludo-surface-400">Waiting for players to join...</p>
                    <p className="text-body-sm text-ludo-surface-600 mt-1">Share the room code: <span className="font-mono text-ludo-gold">{currentRoomId}</span></p>
                  </motion.div>
                )}
              </div>
            </section>

            {/* Game Settings (Host only) */}
            {currentPlayer?.isHost && roomPhase === 'waiting' && (
              <section className="game-card p-6">
                <h2 className="text-heading-md font-bold mb-4 flex items-center gap-2">
                  <Lock className="w-5 h-5 text-ludo-gold" />
                  Game Settings
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-body-sm text-ludo-surface-400 mb-1">Max Players</label>
                    <select 
                      className="game-input"
                      value={roomSettings?.maxPlayers || 4}
                      onChange={(e) => updateSettings(currentRoomId!, currentPlayer!.id, { maxPlayers: parseInt(e.target.value) })}
                    >
                      <option value={2}>2 Players</option>
                      <option value={3}>3 Players</option>
                      <option value={4}>4 Players</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-body-sm text-ludo-surface-400 mb-1">Time Limit</label>
                    <select 
                      className="game-input"
                      value={roomSettings?.timeLimitPerTurn || 30}
                      onChange={(e) => updateSettings(currentRoomId!, currentPlayer!.id, { timeLimitPerTurn: parseInt(e.target.value) })}
                    >
                      <option value={0}>No Limit</option>
                      <option value={15}>15 seconds</option>
                      <option value={30}>30 seconds</option>
                      <option value={60}>60 seconds</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-body-sm text-ludo-surface-400 mb-1">Win Condition</label>
                    <select 
                      className="game-input"
                      value={roomSettings?.winCondition || 'all-pieces'}
                      onChange={(e) => updateSettings(currentRoomId!, currentPlayer!.id, { winCondition: e.target.value as any })}
                    >
                      <option value="all-pieces">All 4 Pieces Home</option>
                      <option value="first-piece">First Piece Home</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-ludo-surface-600 bg-ludo-surface-800 text-ludo-accent focus:ring-ludo-accent"
                        checked={roomSettings?.privateRoom || false}
                        onChange={(e) => updateSettings(currentRoomId!, currentPlayer!.id, { privateRoom: e.target.checked })}
                      />
                      <span className="text-body-sm text-ludo-surface-300">Private Room</span>
                    </label>
                  </div>
                </div>
              </section>
            )}

            {/* Error Display */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 p-4 rounded-xl bg-ludo-red-500/10 border border-ludo-red-500/30 text-ludo-red-400 flex items-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                <span>{error}</span>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Not in a room - show create/join options
  return (
    <div className="min-h-screen flex flex-col">
      <header className="game-card px-6 py-4 flex items-center justify-between border-b border-ludo-surface-800">
        <Link href="/" className="btn-secondary px-4 py-2 flex items-center gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <h1 className="text-heading-lg font-bold text-gradient">Ludo Lobby</h1>
        <div className="w-24" />
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Create Room Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="game-card p-8 mb-6"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, var(--ludo-green-500), var(--ludo-green-600))' }}>
                <Plus className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-heading-lg font-bold text-ludo-surface-100">Create New Room</h2>
              <p className="text-body-sm text-ludo-surface-400 mt-1">Host a game and invite friends</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-body-sm text-ludo-surface-400 mb-1">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="game-input"
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>
              
              <motion.button
                onClick={handleCreateRoom}
                disabled={creating || !playerName.trim() || !connected}
                whileTap={{ scale: 0.97 }}
                className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Dices className="w-5 h-5" />
                    Create Room
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="border-t border-ludo-surface-700" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-ludo-surface-950 px-4 text-ludo-surface-600 text-sm">
              OR
            </div>
          </div>

          {/* Join Room Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="game-card p-8"
          >
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: 'linear-gradient(135deg, var(--ludo-blue-500), var(--ludo-blue-600))' }}>
                <Users className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-heading-lg font-bold text-ludo-surface-100">Join Existing Room</h2>
              <p className="text-body-sm text-ludo-surface-400 mt-1">Enter a room code to join a game</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-body-sm text-ludo-surface-400 mb-1">Your Name</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  className="game-input"
                  placeholder="Enter your name"
                  maxLength={20}
                />
              </div>
              
              <div>
                <label className="block text-body-sm text-ludo-surface-400 mb-1">Room Code</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  className="game-input text-center text-xl tracking-widest font-mono"
                  placeholder="ABC123"
                  maxLength={6}
                  autoComplete="off"
                />
              </div>
              
              <motion.button
                onClick={handleJoinRoom}
                disabled={joining || !playerName.trim() || !joinCode.trim() || !connected}
                whileTap={{ scale: 0.97 }}
                className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
              >
                {joining ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <Users className="w-5 h-5" />
                    Join Room
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>

          {/* Connection Status */}
          <div className="mt-6 text-center">
            <div className={`flex items-center justify-center gap-2 text-body-sm ${connected ? 'text-ludo-green-400' : 'text-ludo-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-ludo-green-400' : 'bg-ludo-red-400'}`} />
              <span>{connected ? 'Connected to server' : 'Connecting...'}</span>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-xl bg-ludo-red-500/10 border border-ludo-red-500/30 text-ludo-red-400 flex items-center gap-2"
            >
              <XCircle className="w-5 h-5" />
              <span>{error}</span>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}