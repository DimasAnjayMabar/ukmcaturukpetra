import React, {useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stage } from '@react-three/drei';
import { KingModel } from './KingModel';

interface KingSceneProps {
  setIsHovered: (isHovered: boolean) => void;
  setCrownPosition: (position: { x: number; y: number }) => void;
}

function RotatingKingModel({ setIsHovered, setCrownPosition }: KingSceneProps) {
  const scrollProgress = useRef(0);
  const { viewport } = useThree();

  useFrame(() => {
    const scrollTop = window.scrollY;
    const windowHeight = window.innerHeight;
    const targetProgress = Math.min(scrollTop / windowHeight, 1);
    
    scrollProgress.current += (targetProgress - scrollProgress.current);
  });

  const baseScale = Math.min(viewport.width, viewport.height) * 0.5;
  const positionX = viewport.width * 0.2;
  const positionY = -viewport.height * 0.8; 
  const positionZ = -40;
  const baseRotationX = -Math.PI / 2 + 0.4;
  const baseRotationY = 0.1;
  const baseRotationZ = 0;
  const scrollRotationX = scrollProgress.current * 0.2;
  const scrollRotationY = scrollProgress.current * 0.6;
  const scrollRotationZ = scrollProgress.current * 0.4;

  return (
    <KingModel
      scale={baseScale}
      position={[positionX, positionY, positionZ]}
      rotation={[
        baseRotationX + scrollRotationX,
        baseRotationY + scrollRotationY,
        baseRotationZ + scrollRotationZ
      ]}
      setIsHovered={setIsHovered}
      setCrownPosition={setCrownPosition}
    />
  );
}

export default function KingScene({ setIsHovered, setCrownPosition }: KingSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ 
        position: [0, 0, 10], 
        fov: 75,
        near: 0.1,
        far: 1000
      }}
      frameloop="always"
      resize={{ 
        scroll: false,
        debounce: { scroll: 50, resize: 0 }
      }}
      style={{ 
        width: '100%', 
        height: '100%',
        display: 'block' 
      }}
    >
      <Stage 
        environment="city" 
        intensity={0.6}
        adjustCamera={false}
        preset="rembrandt"
      >
        <RotatingKingModel
          setIsHovered={setIsHovered}
          setCrownPosition={setCrownPosition}
        />
      </Stage>
    </Canvas>
  );
}