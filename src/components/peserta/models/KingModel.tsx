import React, { useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface KingModelProps {
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  setIsHovered: (isHovered: boolean) => void;
  setCrownPosition: (position: { x: number; y: number }) => void;
}

export function KingModel({
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  setIsHovered,
  setCrownPosition,
}: KingModelProps) {
  const { nodes } = useGLTF('/models/chess_king.glb');
  const modelRef = useRef<THREE.Group>(null!);

  const { camera, size } = useThree();

  const handlePointerOver = () => {
    setIsHovered(true);

    if (modelRef.current) {
      const vec = new THREE.Vector3();
      modelRef.current.getWorldPosition(vec);
      vec.project(camera); 

      const x = (vec.x * 0.5 + 0.5) * size.width;
      const y = (vec.y * -0.5 + 0.5) * size.height;

      setCrownPosition({ x, y });
    }
  };

  const handlePointerOut = () => {
    setIsHovered(false);
  };

  return (
    <group
      ref={modelRef}
      position={position}
      scale={scale}
      rotation={rotation}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <primitive object={nodes.root}>
        <meshStandardMaterial color="#ffffff" metalness={0.2} roughness={0.5} />
      </primitive>
    </group>
  );
}

useGLTF.preload('/models/chess_king.glb');