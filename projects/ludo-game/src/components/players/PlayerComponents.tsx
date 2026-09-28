'use client';

import { Player, Piece } from '@/types/game';
import { clsx } from 'clsx';

interface PlayerInfoProps {
  player: Player;
  isCurrentTurn: boolean;
  pieces: Piece[];
  onClick?: () => void;
}

export function PlayerInfo({ player, isCurrentTurn, pieces, onClick }: PlayerInfoProps) {
  const piecesInBase = pieces.filter(p => p.state === 'base').length;
  const piecesActive = pieces.filter(p => p.state === 'active').length;
  const piecesHome = pieces.filter(p => p.state === 'home').length;
  const piecesFinished = pieces.filter(p => p.state === 'finished').length;

  const colorClasses = {
    red: 'player-red',
    blue: 'player-blue',
    green: 'player-green',
    yellow: 'player-yellow',
  };

  const glowClasses = {
    red: 'player-red-glow',
    blue: 'player-blue-glow',
    green: 'player-green-glow',
    yellow: 'player-yellow-glow',
  };

  return (
    <motion.div
      className={clsx(
        'game-card relative p-4 transition-all duration-300',
        isCurrentTurn && 'glow-ring',
        onClick && 'cursor-pointer hover:scale-[1.02]'
      )}
      onClick={onClick}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      style={{ 
        borderLeft: `4px solid var(--ludo-${player.color}-500)`,
        boxShadow: isCurrentTurn ? `0 0 20px var(--ludo-${player.color}-500/50)` : undefined,
      }}
    >
      {/* Turn indicator */}
      {isCurrentTurn && (
        <motion.div
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `var(--ludo-${player.color}-500)` }}
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </motion.div>
      )}

      <div className="flex items-center gap-3">
        {/* Player color indicator */}
        <div className={clsx('w-10 h-10 rounded-full flex items-center justify-center font-bold text-white', colorClasses[player.color], glowClasses[player.color])}>
          {player.isHost && (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          )}
        </div>

        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-ludo-surface-100 truncate">{player.name}</span>
            {player.isHost && (
              <span className="px-2 py-0.5 text-xs bg-ludo-gold/20 text-ludo-gold rounded-full">Host</span>
            )}
            {!player.isConnected && (
              <span className="px-2 py-0.5 text-xs bg-ludo-red-500/20 text-ludo-red-400 rounded-full">Disconnected</span>
            )}
          </div>
          
          {/* Piece status */}
          <div className="flex items-center gap-1 mt-1 text-xs text-ludo-surface-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `var(--ludo-${player.color}-500)` }}></span>
              {piecesFinished}/4 Home
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-ludo-surface-500"></span>
              {piecesHome} Home Path
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-ludo-surface-600"></span>
              {piecesActive} Active
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-ludo-surface-700"></span>
              {piecesInBase} Base
            </span>
          </div>
        </div>

        {/* Progress ring */}
        <div className="relative w-16 h-16">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              className="text-ludo-surface-700"
              cx="32"
              cy="32"
              r="28"
              fill="none"
              strokeWidth="4"
              stroke="currentColor"
            />
            <motion.circle
              className={clsx('transition-all duration-500', colorClasses[player.color])}
              cx="32"
              cy="32"
              r="28"
              fill="none"
              strokeWidth="4"
              strokeDasharray={176}
              strokeDashoffset={176 - (piecesFinished / 4) * 176}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 0 4px ${glowClasses[player.color]})` }}
              initial={{ strokeDashoffset: 176 }}
              animate={{ strokeDashoffset: 176 - (piecesFinished / 4) * 176 }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-center">
            <span className="text-2xl font-bold text-ludo-surface-100">{piecesFinished}</span>
            <span className="text-xs text-ludo-surface-500 block">/4</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface TurnIndicatorProps {
  currentPlayer: Player | null;
  diceValue: number | null;
  canRoll: boolean;
  onRollDice: () => void;
  rolling: boolean;
}

export function TurnIndicator({ currentPlayer, diceValue, canRoll, onRollDice, rolling }: TurnIndicatorProps) {
  if (!currentPlayer) return null;

  return (
    <motion.div
      className="game-card p-6 text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-center justify-center gap-4 mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${colorClasses[currentPlayer.color]} ${glowClasses[currentPlayer.color]}`}>
          {currentPlayer.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-ludo-surface-400 text-sm">Current Turn</p>
          <p className="text-xl font-bold text-ludo-surface-100">{currentPlayer.name}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4">
        <div className={`dice-cube w-16 h-16 rounded-xl flex items-center justify-center ${rolling ? 'animate-dice-roll' : ''}`}
          style={{ 
            background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
            boxShadow: '0 10px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
          }}
        >
          <DiceFace2D value={diceValue || 1} />
        </div>
        
        <motion.button
          className="btn-primary px-8 py-3 text-lg"
          onClick={onRollDice}
          disabled={!canRoll || rolling || diceValue !== null}
          whileTap={{ scale: 0.97 }}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {rolling ? 'Rolling...' : diceValue ? `Rolled ${diceValue}!` : 'Roll Dice'}
        </motion.button>
      </div>

      {diceValue && (
        <p className="mt-4 text-ludo-surface-400 text-sm">
          Click a highlighted piece to move
        </p>
      )}
    </motion.div>
  );
}

function DiceFace2D({ value }: { value: number }) {
  const DICE_FACES = {
    1: [{ row: 1, col: 1 }],
    2: [{ row: 0, col: 0 }, { row: 2, col: 2 }],
    3: [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }],
    4: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 2 }],
    5: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 2 }],
    6: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 2 }],
  };

  const dots = DICE_FACES[value as keyof typeof DICE_FACES] || [];

  return (
    <div className="grid grid-cols-3 grid-rows-3 gap-1 p-2">
      {[0,1,2].flatMap(row => [0,1,2].map(col => (
        <div
          key={`${row}-${col}`}
          className={`dice-dot ${dots.some(d => d.row === row && d.col === col) ? 'opacity-100' : 'opacity-0'}`}
        />
      )))}
    </div>
  );
}

const colorClasses = {
  red: 'bg-ludo-red-500',
  blue: 'bg-ludo-blue-500',
  green: 'bg-ludo-green-500',
  yellow: 'bg-ludo-yellow-500',
};

const glowClasses = {
  red: 'player-red-glow',
  blue: 'player-blue-glow',
  green: 'player-green-glow',
  yellow: 'player-yellow-glow',
};

interface GameStatusProps {
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

export function GameStatus({ message, type = 'info' }: GameStatusProps) {
  const typeStyles = {
    info: 'border-ludo-blue-500 bg-ludo-blue-500/10 text-ludo-blue-400',
    success: 'border-ludo-green-500 bg-ludo-green-500/10 text-ludo-green-400',
    error: 'border-ludo-red-500 bg-ludo-red-500/10 text-ludo-red-400',
    warning: 'border-ludo-yellow-500 bg-ludo-yellow-500/10 text-ludo-yellow-400',
  };

  const icons = {
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  };

  return (
    <motion.div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${typeStyles[type]} animate-slide-up`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      role="alert"
    >
      {icons[type]}
      <p className="font-medium">{message}</p>
    </motion.div>
  );
}