import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';

type PieceType = 'pawn' | 'rook' | 'knight' | 'bishop' | 'queen' | 'king';
type PieceColor = 'black' | 'white';

interface Piece {
  id: string;
  type: PieceType;
  color: PieceColor;
  pos: string;
}

const pieceIconPaths: Record<PieceType, string> = {
  pawn: '/svg/icons/pawn icon.svg',
  rook: '/svg/icons/rook icon.svg',
  knight: '/svg/icons/knight icon.svg',
  bishop: '/svg/icons/bishop icon.svg',
  queen: '/svg/icons/queen icon.svg',
  king: '/svg/icons/king icon.svg',
};


const initialPieces: Piece[] = [
  { id: 'w_rook_a1', type: 'rook' as PieceType, color: 'white' as PieceColor, pos: 'a1' },
  { id: 'w_knight_b1', type: 'knight' as PieceType, color: 'white' as PieceColor, pos: 'b1' },
  { id: 'w_bishop_c1', type: 'bishop' as PieceType, color: 'white' as PieceColor, pos: 'c1' },
  { id: 'w_queen_d1', type: 'queen' as PieceType, color: 'white' as PieceColor, pos: 'd1' },
  { id: 'w_king_e1', type: 'king' as PieceType, color: 'white' as PieceColor, pos: 'e1' },
  { id: 'w_bishop_f1', type: 'bishop' as PieceType, color: 'white' as PieceColor, pos: 'f1' },
  { id: 'w_knight_g1', type: 'knight' as PieceType, color: 'white' as PieceColor, pos: 'g1' },
  { id: 'w_rook_h1', type: 'rook' as PieceType, color: 'white' as PieceColor, pos: 'h1' },
  ...Array.from('abcdefgh').map(file => ({ id: `w_pawn_${file}2`, type: 'pawn' as PieceType, color: 'white' as PieceColor, pos: `${file}2` })),
  { id: 'b_rook_a8', type: 'rook' as PieceType, color: 'black' as PieceColor, pos: 'a8' },
  { id: 'b_knight_b8', type: 'knight' as PieceType, color: 'black' as PieceColor, pos: 'b8' },
  { id: 'b_bishop_c8', type: 'bishop' as PieceType, color: 'black' as PieceColor, pos: 'c8' },
  { id: 'b_queen_d8', type: 'queen' as PieceType, color: 'black' as PieceColor, pos: 'd8' },
  { id: 'b_king_e8', type: 'king' as PieceType, color: 'black' as PieceColor, pos: 'e8' },
  { id: 'b_bishop_f8', type: 'bishop' as PieceType, color: 'black' as PieceColor, pos: 'f8' },
  { id: 'b_knight_g8', type: 'knight' as PieceType, color: 'black' as PieceColor, pos: 'g8' },
  { id: 'b_rook_h8', type: 'rook' as PieceType, color: 'black' as PieceColor, pos: 'h8' },
  ...Array.from('abcdefgh').map(file => ({ id: `b_pawn_${file}7`, type: 'pawn' as PieceType, color: 'black' as PieceColor, pos: `${file}7` })),
];

const moveSequence = [
  { pieceId: 'w_pawn_e2', to: 'e4', description: "1. e4" },
  { pieceId: 'b_pawn_e7', to: 'e5', description: "1... e5" },
  { pieceId: 'w_knight_g1', to: 'f3', description: "2. Nf3" },
  { pieceId: 'b_knight_b8', to: 'c6', description: "2... Nc6" },
  { pieceId: 'w_bishop_f1', to: 'c4', description: "3. Bc4" },
  { pieceId: 'b_knight_b8', to: 'd4', description: "3... Nd4", annotation: '?!', annotationColor: '#FFD249' },
  { pieceId: 'w_knight_g1', to: 'e5', description: "4. Nxe5", annotation: '?', annotationColor: '#ff6b35', capturedPieceId: 'b_pawn_e7' },
  { pieceId: 'b_queen_d8', to: 'g5', description: "4... Qg5", annotation: '!', annotationColor: '#FCB024' },
  { pieceId: 'w_knight_g1', to: 'f7', description: "5. Nxf7", annotation: '??', annotationColor: '#ff0080', capturedPieceId: 'b_pawn_f7' },
  { pieceId: 'b_queen_d8', to: 'g2', description: "5... Qxg2", capturedPieceId: 'w_pawn_g2' },
  { pieceId: 'w_rook_h1', to: 'f1', description: "6. Rf1", annotation: '?!', annotationColor: '#FFD249' },
  { pieceId: 'b_queen_d8', to: 'e4', description: "6... Qxe4+", capturedPieceId: 'w_pawn_e2', check: true},
  { pieceId: 'w_bishop_f1', to: 'e2', description: "7. Be2",annotation: '??', annotationColor: '#ff0080' },
  { pieceId: 'b_knight_b8', to: 'f3', description: "7... Nf3#",checkmate: true },
];

// helper functions
const algebraicToCoords = (algebraic: string): [number, number] => {
  const col = algebraic.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - parseInt(algebraic.charAt(1));
  return [col, row];
};

interface AnimatedChessboardProps {
  currentMoveIndex: number;
}

interface ChessPieceProps {
  piece: Piece;
  currentPos: [number, number];
  tileSize: number;
}

const AnimatedChessPiece: React.FC<ChessPieceProps> = ({ piece, currentPos, tileSize }) => {
  const pieceSize = tileSize * 0.70;
  const pieceOffset = (tileSize - pieceSize) / 2;
  const dropShadow = 'drop-shadow(2px 2px 1px rgba(0,0,0,0.3))';
  const pieceStyle: React.CSSProperties = {
    filter: piece.color === 'white' ? `invert(1) ${dropShadow}` : dropShadow,
  };
  return (
    <motion.g
      animate={{
        x: currentPos[0] * tileSize + pieceOffset,
        y: currentPos[1] * tileSize + pieceOffset,
      }}
      transition={{ type: 'spring', stiffness: 250, damping: 25 }}
    >
      <image
        href={pieceIconPaths[piece.type]}
        width={pieceSize}
        height={pieceSize}
        style={pieceStyle}
      />
    </motion.g>
  );
};

export const AnimatedChessboard: React.FC<AnimatedChessboardProps> = ({ currentMoveIndex }) => {
  const boardSize = 500;
  const tileSize = boardSize / 8;
  
  const capturedPieceIds = new Set<string>();
  for (let i = 0; i < currentMoveIndex; i++) {
    const move = moveSequence[i];
    if (move?.capturedPieceId) capturedPieceIds.add(move.capturedPieceId);
  }

  const piecePositions = initialPieces
    .filter(piece => !capturedPieceIds.has(piece.id))
    .map(piece => {
      let currentAlgebraicPos = piece.pos;
      for (let i = 0; i < currentMoveIndex; i++) {
        if (moveSequence[i]?.pieceId === piece.id) {
          currentAlgebraicPos = moveSequence[i].to;
        }
      }
      return { ...piece, currentPos: algebraicToCoords(currentAlgebraicPos) };
    });

  const moveIndexForDescription = currentMoveIndex > 0 ? currentMoveIndex - 1 : 0;
  const currentMoveData = moveSequence[moveIndexForDescription];
  // const currentMoveDescription = currentMoveIndex > 0 ? currentMoveData.description : "Game Start";

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="w-full shadow-xl rounded-lg overflow-hidden bg-gradient-to-tr from-[#11121A] via-[#2B3044] to-[#B1C2D8] p-3">
        <svg viewBox={`0 0 ${boardSize} ${boardSize}`} className="w-full h-auto aspect-square">
          <defs>
            <image id="light-tile" href="/svg/icons/white tile.svg" width={tileSize} height={tileSize} />
            <image id="dark-tile" href="/svg/icons/black tile.svg" width={tileSize} height={tileSize} />
          </defs>
          
          <g id="tiles">
            {Array.from({ length: 8 }).map((_, row) =>
              Array.from({ length: 8 }).map((_, col) => (
                <use
                  key={`tile-${row}-${col}`}
                  href={(row + col) % 2 !== 0 ? '#light-tile' : '#dark-tile'}
                  x={col * tileSize}
                  y={row * tileSize}
                />
              ))
            )}
          </g>
          
          <g id="pieces">
            {piecePositions.map(pieceData => (
              <AnimatedChessPiece
                key={pieceData.id}
                piece={pieceData}
                currentPos={pieceData.currentPos}
                tileSize={tileSize}
              />
            ))}
          </g>

          <g id="game-state-indicator">
            <AnimatePresence>
              {(() => {
                const currentMove = moveSequence[currentMoveIndex - 1];
                if (!currentMove || (!currentMove.check && !currentMove.checkmate)) return null;

                const movingPiece = initialPieces.find(p => p.id === currentMove.pieceId);
                const kingInCheckColor = movingPiece?.color === 'white' ? 'black' : 'white';
                const kingInCheck = piecePositions.find(p => p.type === 'king' && p.color === kingInCheckColor);
                if (!kingInCheck) return null;

                const [col, row] = kingInCheck.currentPos;
                const cx = (col + 0.5) * tileSize;
                const cy = (row + 0.5) * tileSize;

                if (currentMove.checkmate) {
                  return (
                    <>
                      <motion.rect 
                        key="mate-overlay" 
                        width={boardSize} 
                        height={boardSize} 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 0.7 }} 
                        exit={{ opacity: 0 }} 
                        fill="rgba(0, 0, 0, 0.8)" 
                        rx="8"
                      />
                      <motion.text
                        key="mate-text"
                        x={boardSize / 2}
                        y={boardSize / 2}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fill="#FFD700"
                        stroke="#FFD700"
                        strokeWidth="3"
                        paintOrder="stroke"
                        fontSize={tileSize * 0.8}
                        fontWeight="bold"
                        fontFamily="font-digofa, sans-serif"
                        initial={{ 
                          scale: 0, 
                          opacity: 0, 
                          rotate: -10 
                        }}
                        animate={{ 
                          scale: 1, 
                          opacity: 1, 
                          rotate: 0,
                          transition: { 
                            delay: 0.3, 
                            type: 'spring',
                            stiffness: 200,
                            damping: 15
                          } 
                        }}
                        exit={{ 
                          scale: 0, 
                          opacity: 0,
                          rotate: 10
                        }}
                      >
                        CHECKMATE
                      </motion.text>
                    </>
                  );
                } else {
                  return (
                    <motion.circle 
                      key={`check-${currentMoveIndex}`} 
                      cx={cx} 
                      cy={cy} 
                      fill="rgba(239, 68, 68, 0.4)" 
                      stroke="rgba(239, 68, 68, 0.8)"
                      strokeWidth="2"
                      initial={{ r: 0 }} 
                      animate={{ r: tileSize * 0.55 }} 
                      exit={{ r: tileSize * 0.8, opacity: 0 }} 
                      style={{ pointerEvents: 'none' }} 
                    />
                  );
                }
              })()}
            </AnimatePresence>
          </g>

          <g id="annotations">
            <AnimatePresence>
              {(() => {
                const moveWithAnnotation = moveSequence[currentMoveIndex - 1];
                if (moveWithAnnotation?.annotation) {
                  const pieceToAnnotate = piecePositions.find(p => p.id === moveWithAnnotation.pieceId);
                  if (!pieceToAnnotate) return null;

                  const [col, row] = pieceToAnnotate.currentPos;
                  const annotationX = (col + 0.75) * tileSize;
                  const annotationY = (row + 0.25) * tileSize;

                  const getAnnotationStyle = (annotation: string) => {
                    switch (annotation) {
                      case '??':
                        return { bg: '#FF4444', text: '#FFFFFF', size: 0.32 };
                      case '?':
                        return { bg: '#FF6B35', text: '#FFFFFF', size: 0.35 };
                      case '?!':
                        return { bg: '#FFA500', text: '#FFFFFF', size: 0.3 };
                      case '!':
                        return { bg: '#32CD32', text: '#FFFFFF', size: 0.35 };
                      case '!!':
                        return { bg: '#228B22', text: '#FFFFFF', size: 0.32 };
                      default:
                        return { bg: '#FFA500', text: '#FFFFFF', size: 0.35 };
                    }
                  };

                  const style = getAnnotationStyle(moveWithAnnotation.annotation);
                  const fontSize = tileSize * style.size;
                  const padding = fontSize * 0.3;
                  const bgWidth = fontSize * moveWithAnnotation.annotation.length * 0.7 + padding * 2;
                  const bgHeight = fontSize + padding;

                  return (
                    <motion.g
                      key={`annotation-${currentMoveIndex}`}
                      initial={{ opacity: 0, scale: 0.5, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.5, y: 10 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    >
                      <rect
                        x={annotationX - bgWidth/2}
                        y={annotationY - bgHeight/2}
                        width={bgWidth}
                        height={bgHeight}
                        fill={style.bg}
                        stroke="rgba(255, 255, 255, 0.3)"
                        strokeWidth="1"
                        rx={bgHeight * 0.3}
                        ry={bgHeight * 0.3}
                        style={{ 
                          pointerEvents: 'none',
                          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                        }}
                      />
                      <text
                        x={annotationX}
                        y={annotationY}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={fontSize}
                        fontWeight="bold"
                        fontFamily="system-ui, -apple-system, sans-serif"
                        fill={style.text}
                        style={{ pointerEvents: 'none' }}
                      >
                        {moveWithAnnotation.annotation}
                      </text>
                    </motion.g>
                  );
                }
                return null;
              })()}
            </AnimatePresence>
          </g>
        </svg>
      </div>
    </div>
  );
};