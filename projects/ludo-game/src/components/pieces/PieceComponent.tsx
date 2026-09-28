'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Piece } from '@/types/game';

interface PieceComponentProps {
  piece: Piece;
  position: { x: number; y: number };
  size: number;
  isSelected: boolean;
  isMovable: boolean;
  isCurrentPlayer: boolean;
  onClick: (pieceId: string) => void;
}

const PLAYER_COLORS: Record<Piece['color'], string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
};

const PLAYER_GLOWS: Record<Piece['color'], string> = {
  red: 'rgba(239, 68, 68, 0.6)',
  blue: 'rgba(59, 130, 246, 0.6)',
  green: 'rgba(34, 197, 94, 0.6)',
  yellow: 'rgba(234, 179, 8, 0.6)',
};

export function PieceComponent({ 
  piece, 
  position, 
  size = 40, 
  isSelected, 
  isMovable, 
  isCurrentPlayer, 
  onClick 
}: PieceComponentProps) {
  const color = PLAYER_COLORS[piece.color];
  const glow = PLAYER_GLOWS[piece.color];

  const pieceStyle = {
    width: `${size}px`,
    height: `${size}px`,
    background: `radial-gradient(circle at 30% 30%, ${color}dd 0%, ${color} 50%, ${color}aa 100%)`,
    boxShadow: `
      0 ${size * 0.1}px ${size * 0.2}px rgba(0, 0, 0, 0.4),
      inset 0 -${size * 0.05}px ${size * 0.1}px rgba(0, 0, 0, 0.3),
      inset 0 ${size * 0.05}px ${size * 0.1}px rgba(255, 255, 255, 0.2),
      ${isSelected || isMovable ? `0 0 ${size * 0.5}px ${glow}` : ''}
    `,
    transform: `translate(${position.x}px, ${position.y}px)`,
  };

  if (piece.state === 'base') {
    return (
      <motion.div
        className="game-piece"
        style={pieceStyle}
        onClick={() => isCurrentPlayer && onClick(piece.id)}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        exit={{ scale: 0, rotate: 180 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        role="button"
        tabIndex={isCurrentPlayer && isMovable ? 0 : -1}
        aria-label={`${piece.color} piece ${piece.index + 1} in base`}
        aria-pressed={isSelected}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-1/2 h-1/2 text-white/80" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        </div>
      </motion.div>
    );
  }

  if (piece.state === 'finished') {
    return (
      <motion.div
        className="game-piece"
        style={{
          ...pieceStyle,
          opacity: 0.7,
          transform: `translate(${position.x}px, ${position.y}px) scale(0.8)`,
        }}
        initial={{ scale: 0.5, rotate: 180 }}
        animate={{ scale: 0.8, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        aria-label={`${piece.color} piece ${piece.index + 1} finished`}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-3/4 h-3/4 text-white" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        </div>
      </motion.div>
    );
  }

  // Active or home pieces
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={piece.id}
        className="game-piece"
        style={pieceStyle}
        onClick={() => isCurrentPlayer && onClick(piece.id)}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && isCurrentPlayer) {
            e.preventDefault();
            onClick(piece.id);
          }
        }}
        initial={{ scale: 0, rotate: -180 }}
        animate={{ 
          scale: isSelected ? 1.25 : 1,
          rotate: isSelected ? 10 : 0,
        }}
        whileTap={{ scale: 0.9 }}
        transition={{ 
          type: 'spring', 
          stiffness: isSelected ? 300 : 260, 
          damping: 20 
        }}
        role="button"
        tabIndex={isCurrentPlayer && isMovable ? 0 : -1}
        aria-label={`${piece.color} piece ${piece.index + 1} ${piece.state === 'home' ? 'in home path' : 'on board'}`}
        aria-pressed={isSelected}
        data-movable={isMovable}
        data-selected={isSelected}
      >
        {/* Piece number indicator */}
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-black/50 text-white text-xs flex items-center justify-center font-bold">
          {piece.index + 1}
        </div>
        
        {/* Selection ring */}
        {isSelected && (
          <motion.div
            className="absolute -inset-1 rounded-full border-2"
            style={{ borderColor: glow }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
          />
        )}
        
        {/* Movable indicator */}
        {isMovable && !isSelected && (
          <motion.div
            className="absolute -inset-1 rounded-full border-2 border-ludo-gold/50"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1.1, opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}

// Stacked pieces for when multiple pieces occupy same cell
export function PieceStack({ 
  pieces, 
  size = 32, 
  onClick 
}: { 
  pieces: Piece[]; 
  size?: number; 
  onClick: (pieceId: string) => void;
}) {
  if (pieces.length === 0) return null;
  
  if (pieces.length === 1) {
    return (
      <PieceComponent
        piece={pieces[0]}
        position={{ x: 0, y: 0 }}
        size={size}
        isSelected={false}
        isMovable={false}
        isCurrentPlayer={false}
        onClick={onClick}
      />
    );
  }

  // Stack multiple pieces with offset
  return (
    <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
      {pieces.map((piece, i) => (
        <PieceComponent
          key={piece.id}
          piece={piece}
          position={{ 
            x: i * (size * 0.15), 
            y: -i * (size * 0.15) 
          }}
          size={size}
          isSelected={false}
          isMovable={false}
          isCurrentPlayer={false}
          onClick={onClick}
        />
      ))}
    </div>
  );
}