'use client';

import React, { useState, useCallback } from 'react';

type ViewDirection = 'front' | 'back' | 'left' | 'right' | 'top' | 'bottom' | 'iso';

interface ViewCubeProps {
  cameraRotation: { x: number; y: number; z: number };
  onViewChange: (view: ViewDirection) => void;
}

interface CubeFace {
  label: string;
  view: ViewDirection;
  transform: string;
}

const CUBE_SIZE = 80;
const HALF = CUBE_SIZE / 2;

const faces: CubeFace[] = [
  { label: 'FRONT',  view: 'front',  transform: `translateZ(${HALF}px)` },
  { label: 'BACK',   view: 'back',   transform: `rotateY(180deg) translateZ(${HALF}px)` },
  { label: 'LEFT',   view: 'left',   transform: `rotateY(-90deg) translateZ(${HALF}px)` },
  { label: 'RIGHT',  view: 'right',  transform: `rotateY(90deg) translateZ(${HALF}px)` },
  { label: 'TOP',    view: 'top',    transform: `rotateX(90deg) translateZ(${HALF}px)` },
  { label: 'BOTTOM', view: 'bottom', transform: `rotateX(-90deg) translateZ(${HALF}px)` },
];

const compassPoints = ['N', 'E', 'S', 'W'] as const;

export default function ViewCube({ cameraRotation, onViewChange }: ViewCubeProps) {
  const [hoveredFace, setHoveredFace] = useState<ViewDirection | null>(null);

  const handleFaceClick = useCallback(
    (view: ViewDirection) => {
      onViewChange(view);
    },
    [onViewChange],
  );

  const cubeTransform = `rotateX(${-cameraRotation.x}deg) rotateY(${cameraRotation.y}deg) rotateZ(${cameraRotation.z}deg)`;
  const compassRotation = `rotate(${-cameraRotation.y}deg)`;

  return (
    <div
      className="absolute top-4 right-4 z-50 flex flex-col items-center gap-1 select-none"
      style={{ width: 120, height: 140 }}
    >
      {/* Cube container */}
      <div
        className="relative cursor-pointer"
        style={{
          width: CUBE_SIZE + 32,
          height: CUBE_SIZE + 32,
          perspective: 400,
        }}
      >
        {/* Cube */}
        <div
          style={{
            width: CUBE_SIZE,
            height: CUBE_SIZE,
            position: 'absolute',
            top: 16,
            left: 16,
            transformStyle: 'preserve-3d',
            transform: cubeTransform,
            transition: 'transform 0.05s linear',
          }}
        >
          {faces.map((face) => {
            const isHovered = hoveredFace === face.view;
            return (
              <div
                key={face.view}
                onClick={() => handleFaceClick(face.view)}
                onMouseEnter={() => setHoveredFace(face.view)}
                onMouseLeave={() => setHoveredFace(null)}
                style={{
                  position: 'absolute',
                  width: CUBE_SIZE,
                  height: CUBE_SIZE,
                  transform: face.transform,
                  backfaceVisibility: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  fontFamily: 'ui-monospace, monospace',
                  color: isHovered ? '#0d1117' : '#8b949e',
                  backgroundColor: isHovered ? '#00D4FF' : '#161b22',
                  border: `1px solid ${isHovered ? '#00D4FF' : '#21262d'}`,
                  cursor: 'pointer',
                  transition: 'background-color 0.15s, color 0.15s, border-color 0.15s',
                  userSelect: 'none',
                }}
              >
                {face.label}
              </div>
            );
          })}

          {/* Axis indicators from the front-bottom-left corner */}
          {/* X axis - red */}
          <div
            style={{
              position: 'absolute',
              width: 28,
              height: 2,
              backgroundColor: '#f85149',
              transformOrigin: '0% 50%',
              transform: `translate3d(${HALF}px, ${HALF}px, ${-HALF}px)`,
              boxShadow: '0 0 4px #f85149',
            }}
          />
          <div
            style={{
              position: 'absolute',
              fontSize: 8,
              fontWeight: 700,
              fontFamily: 'ui-monospace, monospace',
              color: '#f85149',
              transform: `translate3d(${HALF + 30}px, ${HALF - 6}px, ${-HALF}px)`,
            }}
          >
            X
          </div>

          {/* Y axis - green */}
          <div
            style={{
              position: 'absolute',
              width: 2,
              height: 28,
              backgroundColor: '#3fb950',
              transformOrigin: '50% 100%',
              transform: `translate3d(${HALF - 1}px, ${HALF - 28}px, ${-HALF}px)`,
              boxShadow: '0 0 4px #3fb950',
            }}
          />
          <div
            style={{
              position: 'absolute',
              fontSize: 8,
              fontWeight: 700,
              fontFamily: 'ui-monospace, monospace',
              color: '#3fb950',
              transform: `translate3d(${HALF + 4}px, ${HALF - 36}px, ${-HALF}px)`,
            }}
          >
            Y
          </div>

          {/* Z axis - blue */}
          <div
            style={{
              position: 'absolute',
              width: 28,
              height: 2,
              backgroundColor: '#58a6ff',
              transformOrigin: '0% 50%',
              transform: `translate3d(${HALF}px, ${HALF}px, ${-HALF}px) rotateY(-90deg)`,
              boxShadow: '0 0 4px #58a6ff',
            }}
          />
          <div
            style={{
              position: 'absolute',
              fontSize: 8,
              fontWeight: 700,
              fontFamily: 'ui-monospace, monospace',
              color: '#58a6ff',
              transform: `translate3d(${HALF - 4}px, ${HALF - 6}px, ${-HALF - 30}px)`,
            }}
          >
            Z
          </div>
        </div>

        {/* ISO view click zone - corner area */}
        <button
          onClick={() => onViewChange('iso')}
          className="absolute bottom-0 right-0 w-4 h-4 rounded-full opacity-0 hover:opacity-100"
          style={{ backgroundColor: '#00D4FF33', border: '1px solid #00D4FF' }}
          title="Isometric View"
        />
      </div>

      {/* Compass ring */}
      <div
        className="relative"
        style={{
          width: 52,
          height: 52,
          marginTop: -4,
        }}
      >
        <div
          className="absolute inset-0 rounded-full"
          style={{
            border: '1.5px solid #21262d',
            backgroundColor: '#0d1117cc',
          }}
        />
        <div
          className="absolute inset-0"
          style={{ transform: compassRotation, transition: 'transform 0.05s linear' }}
        >
          {compassPoints.map((point, i) => {
            const angle = i * 90;
            const rad = (angle - 90) * (Math.PI / 180);
            const r = 20;
            const cx = 26 + Math.cos(rad) * r;
            const cy = 26 + Math.sin(rad) * r;
            const isNorth = point === 'N';
            return (
              <span
                key={point}
                className="absolute"
                style={{
                  fontSize: 8,
                  fontWeight: 700,
                  fontFamily: 'ui-monospace, monospace',
                  color: isNorth ? '#f85149' : '#484f58',
                  left: cx,
                  top: cy,
                  transform: 'translate(-50%, -50%)',
                  lineHeight: 1,
                }}
              >
                {point}
              </span>
            );
          })}
          {/* Compass needle */}
          <div
            className="absolute"
            style={{
              width: 1.5,
              height: 10,
              backgroundColor: '#f85149',
              left: '50%',
              top: 8,
              transform: 'translateX(-50%)',
              borderRadius: 1,
              opacity: 0.7,
            }}
          />
          <div
            className="absolute"
            style={{
              width: 1.5,
              height: 10,
              backgroundColor: '#484f58',
              left: '50%',
              bottom: 8,
              transform: 'translateX(-50%)',
              borderRadius: 1,
              opacity: 0.5,
            }}
          />
        </div>
        {/* Center dot */}
        <div
          className="absolute rounded-full"
          style={{
            width: 4,
            height: 4,
            backgroundColor: '#00D4FF',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            boxShadow: '0 0 4px #00D4FF88',
          }}
        />
      </div>
    </div>
  );
}
