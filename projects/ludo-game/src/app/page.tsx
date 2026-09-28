'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Dices, Users, Plus, Lock, Zap } from 'lucide-react';
import { useRoom } from '@/lib/socket/client';

const SQUARE_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308',
  '#f97316', '#06b6d4', '#a855f7', '#ec4899',
];

function MiniBoard() {
  const [rolling, setRolling] = useState(false);
  const [dieValue, setDieValue] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setRolling(true);
      const v = Math.floor(Math.random() * 6) + 1;
      setTimeout(() => {
        setDieValue(v);
        setRolling(false);
      }, 400);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  const dots = (() => {
    switch (dieValue) {
      case 1: return <div className="w-3 h-3 rounded-full bg-white" />;
      case 2: return <><div className="w-3 h-3 rounded-full bg-white absolute top-2 left-2" /><div className="w-3 h-3 rounded-full bg-white absolute bottom-2 right-2" /></>;
      case 3: return <><div className="w-3 h-3 rounded-full bg-white absolute top-2 left-2" /><div className="w-3 h-3 rounded-full bg-white" /><div className="w-3 h-3 rounded-full bg-white absolute bottom-2 right-2" /></>;
      case 4: return <><div className="w-3 h-3 rounded-full bg-white absolute top-2 left-2" /><div className="w-3 h-3 rounded-full bg-white absolute top-2 right-2" /><div className="w-3 h-3 rounded-full bg-white absolute bottom-2 left-2" /><div className="w-3 h-3 rounded-full bg-white absolute bottom-2 right-2" /></>;
      case 5: return <><div className="w-3 h-3 rounded-full bg-white absolute top-2 left-2" /><div className="w-3 h-3 rounded-full bg-white absolute top-2 right-2" /><div className="w-3 h-3 rounded-full bg-white" /><div className="w-3 h-3 rounded-full bg-white absolute bottom-2 left-2" /><div className="w-3 h-3 rounded-full bg-white absolute bottom-2 right-2" /></>;
      default: return <><div className="w-3 h-3 rounded-full bg-white absolute top-2 left-2" /><div className="w-3 h-3 rounded-full bg-white absolute top-2 right-2" /><div className="w-3 h-3 rounded-full bg-white absolute top-2" style={{left:'50%',transform:'translateX(-50%)'}} /><div className="w-3 h-3 rounded-full bg-white absolute bottom-2 left-2" /><div className="w-3 h-3 rounded-full bg-white absolute bottom-2 right-2" /></>;
    }
  })();

  return (
    <div className="flex flex-col items-center gap-6">
      <motion.div
        animate={rolling ? { rotate: 360 } : { rotate: 0 }}
        transition={rolling ? { duration: 0.5, ease: 'linear' } : { duration: 0 }}
        className="relative w-16 h-16 rounded-xl flex items-center justify-center"
        style={{ background: 'linear-gradient(145deg, #1e293b, #0f172a)', boxShadow: '0 8px 24px rgba(233,69,96,0.3)' }}
      >
        {dots}
      </motion.div>
    </div>
  );
}

function BoardPreview() {
  const boardSize = 14;
  const cells: { color: string; hasPiece: boolean; pieceColor: string }[] = [];
  
  for (let r = 0; r < boardSize; r++) {
    for (let c = 0; c < boardSize; c++) {
      const isSafe = (r === 0 || r === boardSize-1 || c === 0 || c === boardSize-1) && Math.random() > 0.7;
      const color = isSafe ? 'var(--ludo-gold)' : 'rgba(255,255,255,0.04)';
      const hasPiece = Math.random() > 0.85;
      const pieceColor = SQUARE_COLORS[Math.floor(Math.random() * SQUARE_COLORS.length)];
      cells.push({ color, hasPiece, pieceColor });
    }
  }

  return (
      <div className="relative rounded-2xl overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #16213e 0%, #0f172a 100%)', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div className="grid gap-px p-1" style={{ width: '280px', height: '280px', gridTemplateColumns: 'repeat(14, 1fr)', gridTemplateRows: 'repeat(14, 1fr)' }}>
        {cells.map((cell, i) => (
          <div key={i} className="relative flex items-center justify-center" style={{ background: cell.color, aspectRatio: '1' }}>
            {cell.hasPiece && (
              <div className="w-3 h-3 rounded-full" style={{ background: cell.pieceColor, boxShadow: `0 0 6px ${cell.pieceColor}` }} />
            )}
          </div>
        ))}
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-12 h-12 rounded-lg bg-ludo-surface-800/80 border border-ludo-gold/30 flex items-center justify-center">
          <Dices className="w-6 h-6 text-ludo-gold/60" />
        </div>
      </div>
    </div>
  );
}

function PlayerAvatar({ color, name }: { color: string; name: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: `${color}15`, border: `1px solid ${color}40` }}>
      <div className="w-6 h-6 rounded-full" style={{ background: color }} />
      <span className="text-body-xs text-ludo-surface-300">{name}</span>
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { connected, createRoom, currentRoomId } = useRoom();
  const [playerName, setPlayerName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleQuickPlay = async () => {
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
      if (result.success && currentRoomId) {
        router.push('/lobby');
      } else {
        setError(result.error || 'Failed to create room');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 py-12 relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/3 left-1/4 w-72 h-72 rounded-full bg-ludo-red-500/[0.08] blur-3xl" />
          <div className="absolute bottom-1/3 right-1/4 w-72 h-72 rounded-full bg-ludo-blue-500/[0.08] blur-3xl" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-ludo-gold/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left - Board & Title */}
            <div className="flex flex-col items-center lg:items-start">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 100, damping: 15, duration: 1 }}
                className="game-board p-6 mb-8"
              >
                <BoardPreview />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex items-center gap-1">
                    {[0,1,2,3].map(i => (
                      <PlayerAvatar key={i} color={SQUARE_COLORS[i]} name={`Player ${i+1}`} />
                    ))}
                  </div>
                  <span className="text-body-xs text-ludo-surface-500">2-4 Players</span>
                </div>
              </motion.div>
            </div>

            {/* Right - CTA */}
            <div className="flex flex-col items-center lg:items-start">
              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.6 }}
                className="text-display-xl font-bold mb-4 text-center lg:text-left"
              >
                <span className="text-gradient">Ludo</span>{' '}
                <span className="text-ludo-surface-100">Master</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-body-lg text-ludo-surface-400 mb-8 text-center lg:text-left max-w-md"
              >
                Real-time multiplayer Ludo. Play with friends or challenge the world.
              </motion.p>

              {/* Dice */}
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, duration: 0.6, type: 'spring' }}
                className="mb-8"
              >
                <MiniBoard />
              </motion.div>

              {/* Quick Play Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="game-card p-6 w-full max-w-md"
              >
                <h2 className="text-heading-md font-bold text-ludo-surface-100 mb-4 text-center">Quick Play</h2>

                {/* Name Input */}
                <div className="mb-4">
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

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <motion.button
                    onClick={handleQuickPlay}
                    disabled={creating || !connected}
                    whileTap={{ scale: 0.97 }}
                    className="btn-primary flex-1 py-3 text-lg flex items-center justify-center gap-2"
                  >
                    {creating ? (
                      <>
                        <Zap className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Dices className="w-5 h-5" />
                        Play Now
                      </>
                    )}
                  </motion.button>

                  <Link href="/lobby?mode=create" className="btn-secondary flex-1 py-3 text-lg flex items-center justify-center gap-2">
                    <Plus className="w-5 h-5" />
                    Create Room
                  </Link>
                </div>

                <Link href="/lobby" className="block text-center mt-3 text-body-sm text-ludo-surface-400 hover:text-ludo-surface-200 transition-colors">
                  Join existing room →
                </Link>

                {/* Connection Status */}
                <div className="mt-4 flex items-center justify-center gap-2 text-body-xs">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-ludo-green-400' : 'bg-ludo-red-400 animate-pulse'}`} />
                  <span className={connected ? 'text-ludo-green-400' : 'text-ludo-red-400'}>
                    {connected ? 'Connected' : 'Connecting...'}
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Error */}
      {error && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 rounded-xl bg-ludo-red-500/10 border border-ludo-red-500/30 text-ludo-red-400 text-body-sm flex items-center gap-2 z-50">
          {error}
        </div>
      )}

      {/* Footer */}
      <footer className="py-6 px-4 border-t border-ludo-surface-800">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-ludo-surface-500 text-body-xs">
          <p>Ludo Master — Built with Next.js, Socket.io & Tailwind CSS</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-sm" style={{ background: '#ef4444' }} />
              <div className="w-3 h-3 rounded-sm" style={{ background: '#3b82f6' }} />
              <div className="w-3 h-3 rounded-sm" style={{ background: '#22c55e' }} />
              <div className="w-3 h-3 rounded-sm" style={{ background: '#eab308' }} />
            </div>
            <span>Real-time Multiplayer</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
