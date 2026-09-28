'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DiceProps {
  value: number;
  rolling: boolean;
  canRoll: boolean;
  onRoll: () => void;
  disabled?: boolean;
}

const DICE_FACES = {
  1: [{ row: 1, col: 1 }],
  2: [{ row: 0, col: 0 }, { row: 2, col: 2 }],
  3: [{ row: 0, col: 0 }, { row: 1, col: 1 }, { row: 2, col: 2 }],
  4: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 2 }],
  5: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 1 }, { row: 2, col: 0 }, { row: 2, col: 2 }],
  6: [{ row: 0, col: 0 }, { row: 0, col: 2 }, { row: 1, col: 0 }, { row: 1, col: 2 }, { row: 2, col: 0 }, { row: 2, col: 2 }],
};

export function Dice({ value, rolling, canRoll, onRoll, disabled }: DiceProps) {
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (rolling) {
      setAnimationKey(k => k + 1);
    }
  }, [rolling]);

  const handleClick = () => {
    if (canRoll && !disabled && !rolling) {
      onRoll();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && canRoll && !disabled && !rolling) {
      e.preventDefault();
      onRoll();
    }
  };

  return (
    <motion.button
      className="dice-cube perspective-1000 transform-style-3d focus-visible-ring"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      disabled={disabled || !canRoll || rolling}
      aria-label={`Dice showing ${value}, ${canRoll ? 'press to roll' : rolling ? 'rolling' : 'waiting for turn'}`}
      whileTap={{ scale: 0.95 }}
      animate={rolling ? { rotateX: 720, rotateY: 360 } : { rotateX: 0, rotateY: 0 }}
      transition={rolling ? { duration: 0.6, ease: 'cubicBezier(0.68, -0.55, 0.265, 1.55)' } : { duration: 0 }}
      style={{ width: '80px', height: '80px' }}
    >
      <AnimatePresence mode="wait">
        <div 
          key={animationKey}
          className="relative w-full h-full transform-style-3d"
          style={{ transform: rolling ? 'rotateX(720deg) rotateY(360deg)' : 'rotateX(0deg) rotateY(0deg)' }}
        >
          {/* Front face */}
          <div className="dice-face absolute inset-0" style={{ transform: 'translateZ(40px)' }}>
            <DiceFace value={value} />
          </div>
          {/* Back face */}
          <div className="dice-face absolute inset-0 backface-hidden" style={{ transform: 'rotateY(180deg) translateZ(40px)' }}>
            <DiceFace value={7 - value} />
          </div>
          {/* Right face */}
          <div className="dice-face absolute inset-0 backface-hidden" style={{ transform: 'rotateY(90deg) translateZ(40px)' }}>
            <DiceFace value={value > 3 ? value - 3 : value + 3} />
          </div>
          {/* Left face */}
          <div className="dice-face absolute inset-0 backface-hidden" style={{ transform: 'rotateY(-90deg) translateZ(40px)' }}>
            <DiceFace value={value > 3 ? value + 3 : 6 - value} />
          </div>
          {/* Top face */}
          <div className="dice-face absolute inset-0 backface-hidden" style={{ transform: 'rotateX(90deg) translateZ(40px)' }}>
            <DiceFace value={value % 2 === 0 ? value - 1 : value + 1} />
          </div>
          {/* Bottom face */}
          <div className="dice-face absolute inset-0 backface-hidden" style={{ transform: 'rotateX(-90deg) translateZ(40px)' }}>
            <DiceFace value={value % 2 === 0 ? value + 1 : value - 1} />
          </div>
        </div>
      </AnimatePresence>
      
      {/* Rolling indicator */}
      {rolling && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-ludo-gold text-sm font-medium animate-pulse">
          Rolling...
        </div>
      )}
    </motion.button>
  );
}

function DiceFace({ value }: { value: number }) {
  const dots = DICE_FACES[value as keyof typeof DICE_FACES] || [];
  
  return (
    <div className="flex flex-col justify-between p-3 h-full w-full">
      {dots.map((dot, i) => (
        <div key={i} className="flex justify-between h-1/3">
          {[0, 1, 2].map((col) => (
            <div
              key={col}
              className={`dice-dot ${dots.some(d => d.row === Math.floor(i / 3) && d.col === col) ? 'opacity-100' : 'opacity-0'}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Simplified 2D dice for smaller screens
export function Dice2D({ value, rolling, canRoll, onRoll, disabled }: DiceProps) {
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    if (rolling) {
      setAnimationKey(k => k + 1);
    }
  }, [rolling]);

  return (
    <motion.button
      className="dice-cube w-16 h-16 rounded-xl flex items-center justify-center focus-visible-ring"
      onClick={onRoll}
      disabled={disabled || !canRoll || rolling}
      aria-label={`Dice showing ${value}`}
      whileTap={{ scale: 0.9 }}
      animate={{ rotate: rolling ? 360 : 0 }}
      transition={rolling ? { duration: 0.5, repeat: 2, ease: 'linear' } : { duration: 0 }}
      style={{ 
        background: 'linear-gradient(145deg, #1e293b 0%, #0f172a 100%)',
        boxShadow: '0 10px 20px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
      }}
    >
      <AnimatePresence mode="wait">
        <div key={animationKey} className="flex flex-wrap justify-center gap-1 p-2">
          {DICE_FACES[value as keyof typeof DICE_FACES].map((dot, i) => (
            <motion.div
              key={i}
              className="dice-dot"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ delay: i * 0.05 }}
            />
          ))}
        </div>
      </AnimatePresence>
    </motion.button>
  );
}