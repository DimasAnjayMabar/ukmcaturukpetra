import React, { useState, useEffect } from 'react';
import { X, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface ChessPiece {
  name: string;
  icon: string;
  title: string;
  intro: string;
  description: string;
  placementImage: string;
  movesImage: string;
}

const chessPieces: ChessPiece[] = [
  {
    name: 'pawn',
    icon: '/svg/icons/pawn icon w.svg',
    title: 'The Pawn',
    intro: "When a game begins, each side starts with 8 pawns.",
    description: "The pawn is the least powerful piece and is worth 1 point. If it is a pawn's first move, it can move forward one or two squares. If a pawn has already moved, then it can move forward just one square at a time. It attacks (or captures) each square diagonally to the left or right.",
    placementImage: '/png/guides/pawn placement.png',
    movesImage: '/png/guides/pawn moves.png'
  },
  {
    name: 'bishop',
    icon: '/svg/icons/bishop icon w.svg',
    title: 'The Bishop',
    intro: "Each side starts with 2 bishops.",
    description: "The bishop is considered a minor piece (like a knight) and is worth 3 points. A bishop can move diagonally as many squares as it likes, as long as it is not blocked by its own pieces or an occupied square. An easy way to remember how a bishop can move is that it moves like an \"X\" shape. It can capture an enemy piece by moving to the occupied square where the piece is located.",
    placementImage: '/png/guides/bishop placement.png',
    movesImage: '/png/guides/bishop moves.png'
  },
  {
    name: 'knight',
    icon: '/svg/icons/knight icon w.svg',
    title: 'The Knight',
    intro: "Each side starts with 2 knights—a king's knight and a queen's knight.",
    description: "The knight is considered a minor piece (like a bishop) and is worth 3  points. The knight is the only piece in chess that can jump over another piece! Simply put, the knight moves in an \"L-shape.\" The knight can capture only what it lands on, not what it jumps over!",
    placementImage: '/png/guides/knight placement.png',
    movesImage: '/png/guides/knight moves.png'
  },
  {
    name: 'rook',
    icon: '/svg/icons/rook icon w.svg',
    title: 'The Rook',
    intro: "Each side starts with 2 rooks, one on the queenside and one on the kingside. All four rooks are located in the corners of the board.",
    description: "The rook is considered a major piece (like the queen) and is worth 5 points. It can move as many squares as it likes left/right horizontally, or up/down vertically (as long as it isn't blocked by other pieces). An easy way to remember how a rook can move is that it moves like a \"+\" sign.",
    placementImage: '/png/guides/rook placement.png',
    movesImage: '/png/guides/rook moves.png'
  },
  {
    name: 'queen',
    icon: '/svg/icons/queen icon w.svg',
    title: 'The Queen',
    intro: "The queen is the most powerful chess piece! When a game begins, each side starts with 1 queen.",
    description: "The queen is considered a major piece (like a rook) and is worth 9 points. It can move as many squares as it likes left/right horizontally, or up/down vertically (like a rook). The queen can also move as many squares as it likes diagonally (like a bishop). An easy way to remember how a queen can move is that it moves like a rook and a bishop combined!",
    placementImage: '/png/guides/queen placement.png',
    movesImage: '/png/guides/queen moves.png'
  },
  {
    name: 'king',
    icon: '/svg/icons/king icon w.svg',
    title: 'The King',
    intro: "The king is the most important chess piece. The goal of a game of chess is to checkmate the king! When a game starts, each side has 1 king.",
    description: "The king is not a very powerful piece, as it can only move (or capture) 1 square in any direction. Please note that the king cannot be captured! When a king is attacked, it is called \"check.\"",
    placementImage: '/png/guides/king placement.png',
    movesImage: '/png/guides/king moves.png'
  }
];

export default function ChessPiecesGuide() {
  const [selectedPieceIndex, setSelectedPieceIndex] = useState<number | null>(null);
  const [hoveredPiece, setHoveredPiece] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (selectedPieceIndex !== null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [selectedPieceIndex]);

  const handlePieceClick = (piece: ChessPiece) => {
    const index = chessPieces.findIndex(p => p.name === piece.name);
    setSelectedPieceIndex(index);
  };

  const handleCloseModal = () => {
    setSelectedPieceIndex(null);
  };

  const handleNavigation = (direction: 'prev' | 'next') => {
    if (selectedPieceIndex === null || isTransitioning) return;
    
    setIsTransitioning(true);
    
    setTimeout(() => {
      if (direction === 'prev') {
        setSelectedPieceIndex(prevIndex => 
          prevIndex === 0 ? chessPieces.length - 1 : prevIndex! - 1
        );
      } else {
        setSelectedPieceIndex(prevIndex => 
          prevIndex === chessPieces.length - 1 ? 0 : prevIndex! + 1
        );
      }
      
      setTimeout(() => {
        setIsTransitioning(false);
      }, 150);
    }, 150);
  };

  const selectedPiece = selectedPieceIndex !== null ? chessPieces[selectedPieceIndex] : null;

  return (
    <>
      <section className="py-16 bg-[#141413]">
        <div className="container mx-auto px-4">
          {/* <h3 className="text-2xl md:text-3xl font-bold text-center text-gray-900 mb-8">
            Chess Pieces
          </h3> */}
          <div className="flex justify-center items-center gap-12 md:gap-16 flex-wrap">
            {chessPieces.map((piece) => (
              <div
                key={piece.name}
                className="flex flex-col items-center cursor-pointer group"
                onClick={() => handlePieceClick(piece)}
                onMouseEnter={() => setHoveredPiece(piece.name)}
                onMouseLeave={() => setHoveredPiece(null)}
              >
                <div className="w-20 h-20 md:w-24 md:h-24 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                  <img
                    src={piece.icon}
                    alt={`${piece.name} icon`}
                    className="w-12 h-12 md:w-14 md:h-14"
                  />
                </div>
                
                <div className="flex items-center justify-center relative">
                  <span 
                    className={`text-base md:text-lg font-medium text-[#E7E7E7] uppercase tracking-wide transition-transform duration-300 ${
                      hoveredPiece === piece.name ? '-translate-x-4' : 'translate-x-0'
                    }`}
                  >
                    {piece.name}
                  </span>
                  
                  <div className={`absolute w-6 h-6 bg-black rounded-full flex items-center justify-center transition-all duration-300 ${
                    hoveredPiece === piece.name 
                      ? 'opacity-100 translate-x-0' 
                      : 'opacity-0 translate-x-2'
                  }`}
                  style={{
                    left: `calc(50% + ${piece.name.length * 0.35}ch + 0.5rem)`
                  }}>
                    <ArrowRight className="w-3 h-3 text-white" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedPiece && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center px-4"
          onClick={handleCloseModal}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNavigation('prev');
            }}
            className="absolute left-1/4 top-1/2 -translate-y-1/2 p-3 rounded-full transition-colors z-10"
            aria-label="Previous piece"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleNavigation('next');
            }}
            className="absolute right-1/4 top-1/2 -translate-y-1/2 p- rounded-full transition-colors z-10"
            aria-label="Next piece"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>

          <div 
            className="max-w-xl w-full relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute -top-4 -right-4 p-2  bg-white/10 hover:bg-white/20 rounded-full shadow-lg transition-colors z-10"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-white" />
            </button>

            <div className={`text-white transition-opacity duration-300 ${
              isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}>
              <h2 className="text-xl md:text-2xl font-bold mb-3 text-center">
                {selectedPiece.title}
              </h2>

              <p className="text-sm md:text-base mb-4 leading-relaxed text-center opacity-90">
                {selectedPiece.intro}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex justify-center">
                  <img
                    src={selectedPiece.placementImage}
                    alt={`${selectedPiece.name} placement`}
                    className="w-full max-w-md h-auto rounded"
                  />
                </div>
                <div className="flex justify-center">
                  <img
                    src={selectedPiece.movesImage}
                    alt={`${selectedPiece.name} moves`}
                    className="w-full max-w-md h-auto rounded"
                  />
                </div>
              </div>

              <p className="text-xs md:text-sm leading-relaxed text-center opacity-90">
                {selectedPiece.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}