'use client';

import { useMemo } from 'react';
import { Piece } from '@/types/game';
import { getMainPathCoordinates, getHomePathCoordinates, getBaseCoordinates, START_POSITIONS, HOME_ENTRY, SAFE_ZONES, MAIN_PATH_LENGTH } from '@/lib/game/engine';
import { PieceComponent } from '@/components/pieces/PieceComponent';

interface BoardCellProps {
  index: number | string;
  row: number;
  col: number;
  pieces: Piece[];
  isSafeZone: boolean;
  isStartPosition: string | null;
  isHomeEntry: string | null;
  isHomePath: string | null;
  highlight: boolean;
  onClick: (index: number | string) => void;
}

function BoardCell({ 
  index, 
  row, 
  col, 
  pieces, 
  isSafeZone, 
  isStartPosition, 
  isHomeEntry, 
  isHomePath, 
  highlight, 
  onClick 
}: BoardCellProps) {
  const cellClasses = `
    board-cell relative flex items-center justify-center 
    ${isSafeZone ? 'safe-zone' : ''}
    ${isStartPosition ? 'start-position' : ''}
    ${isHomeEntry ? 'home-entry' : ''}
    ${isHomePath ? 'home-path' : ''}
    ${highlight ? 'highlighted' : ''}
  `;

  return (
    <div 
      className={cellClasses}
      onClick={() => onClick(index)}
      style={{ gridRow: row + 1, gridColumn: col + 1 }}
      data-index={index}
    >
      {/* Safe zone star */}
      {isSafeZone && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-ludo-gold/50">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
      )}
      
      {/* Start position indicator */}
      {isStartPosition && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2"
          style={{ borderColor: `var(--ludo-${isStartPosition}-500)` }}>
        </div>
      )}
      
      {/* Home entry indicator */}
      {isHomeEntry && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded"
          style={{ backgroundColor: `var(--ludo-${isHomeEntry}-500)` }}>
        </div>
      )}
      
      {/* Pieces in this cell */}
      <div className="relative z-10 flex flex-wrap justify-center gap-0.5">
        {pieces.map((piece) => (
          <PieceComponent 
            key={piece.id}
            piece={piece}
            size={28}
            isCurrentPlayer={false}
            onClick={() => {}}
          />
        ))}
      </div>
    </div>
  );
}

interface GameBoardProps {
  pieces: Piece[];
  currentPlayerId: string | null;
  selectedPieceId: string | null;
  movablePieceIds: string[];
  diceValue: number | null;
  onPieceClick: (pieceId: string) => void;
  onCellClick: (index: number | string) => void;
}

export function GameBoard({ 
  pieces, 
  currentPlayerId, 
  selectedPieceId, 
  movablePieceIds, 
  diceValue,
  onPieceClick, 
  onCellClick 
}: GameBoardProps) {
  // Organize pieces by position
  const piecesByPosition = useMemo(() => {
    const map = new Map<string, Piece[]>();
    
    for (const piece of pieces) {
      let key: string;
      if (piece.state === 'base') {
        key = `base-${piece.color}-${piece.index}`;
      } else if (piece.state === 'home') {
        key = `home-${piece.color}-${piece.position.pathIndex}`;
      } else if (piece.state === 'active') {
        key = `main-${piece.position.pathIndex}`;
      } else {
        key = 'finished';
      }
      
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(piece);
    }
    
    return map;
  }, [pieces]);

  // Generate board cells (15x15 grid)
  const cells = useMemo(() => {
    const cellData: any[] = [];
    
    // Main path cells (52 positions)
    for (let i = 0; i < MAIN_PATH_LENGTH; i++) {
      const coords = getMainPathCoordinates(i);
      const positionKey = `main-${i}`;
      const cellPieces = piecesByPosition.get(positionKey) || [];
      
      const isSafeZone = SAFE_ZONES.includes(i);
      const isStartPosition = Object.entries(START_POSITIONS).find(([_, v]) => v === i)?.[0] || null;
      const isHomeEntry = Object.entries(HOME_ENTRY).find(([_, v]) => v === i)?.[0] || null;
      
      const selectedPiece = selectedPieceId ? pieces.find(p => p.id === selectedPieceId) : null;
      const canMoveToThisCell = selectedPiece && movablePieceIds.includes(selectedPieceId);
      
      cellData.push({
        index: i,
        row: coords.row,
        col: coords.col,
        pieces: cellPieces,
        isSafeZone,
        isStartPosition,
        isHomeEntry,
        isHomePath: false,
        highlight: canMoveToThisCell && selectedPiece?.state === 'active' && 
          diceValue && ((selectedPiece.position.pathIndex + diceValue) % MAIN_PATH_LENGTH === i),
      });
    }
    
    return cellData;
  }, [piecesByPosition, selectedPieceId, movablePieceIds, pieces, diceValue]);

  // Home paths for each color
  const homePaths = useMemo(() => {
    const paths: any[] = [];
    const colors = ['red', 'blue', 'green', 'yellow'] as const;
    
    for (const color of colors) {
      for (let i = 0; i < 6; i++) {
        const coords = getHomePathCoordinates(color, i);
        const positionKey = `home-${color}-${i}`;
        const cellPieces = piecesByPosition.get(positionKey) || [];
        
        paths.push({
          index: `home-${color}-${i}`,
          row: coords.row,
          col: coords.col,
          pieces: cellPieces,
          isSafeZone: false,
          isStartPosition: null,
          isHomeEntry: null,
          isHomePath: color,
          highlight: false,
        });
      }
    }
    
    return paths;
  }, [piecesByPosition]);

  // Base areas
  const bases = useMemo(() => {
    const baseAreas: any[] = [];
    const colors = ['red', 'blue', 'green', 'yellow'] as const;
    
    for (const color of colors) {
      for (let i = 0; i < 4; i++) {
        const coords = getBaseCoordinates(color, i);
        const positionKey = `base-${color}-${i}`;
        const cellPieces = piecesByPosition.get(positionKey) || [];
        
        baseAreas.push({
          index: `base-${color}-${i}`,
          row: coords.row,
          col: coords.col,
          pieces: cellPieces,
          isSafeZone: false,
          isStartPosition: null,
          isHomeEntry: null,
          isHomePath: null,
          highlight: false,
        });
      }
    }
    
    return baseAreas;
  }, [piecesByPosition]);

  return (
    <div className="game-board aspect-square max-w-full overflow-hidden">
      <div className="relative w-full h-full grid grid-cols-15 grid-rows-15 gap-0.5 p-1">
        {/* Main path cells */}
        {cells.map((cell) => (
          <BoardCell
            key={cell.index}
            {...cell}
            onClick={onCellClick}
          />
        ))}
        
        {/* Home paths */}
        {homePaths.map((cell) => (
          <BoardCell
            key={cell.index}
            {...cell}
            onClick={onCellClick}
          />
        ))}
        
        {/* Base areas */}
        {bases.map((cell) => (
          <BoardCell
            key={cell.index}
            {...cell}
            onClick={onCellClick}
          />
        ))}
        
        {/* Center home */}
        <div 
          className="board-cell relative flex items-center justify-center bg-ludo-surface-800/50 rounded-xl"
          style={{ gridRow: 8, gridColumn: 8 }}
        >
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-ludo-gold/20 to-ludo-accent/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-ludo-gold/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}