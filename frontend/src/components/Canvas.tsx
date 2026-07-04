import React, { useEffect, useRef, useState } from 'react';
import type { Hand, Point, Path, Tool, Gesture } from '../types/canvas';

interface CanvasProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  showWebcam: boolean;
  webcamOpacity: number;
  mirrorCamera: boolean;
  hands: Hand[];
  cursor: Point | null;
  smoothedPoint: Point | null;
  gesture: Gesture;
  brushColor: string;
  brushSize: number;
  brushOpacity: number;
  activeTool: Tool;
  paths: Path[];
  points: Point[];
  setPaths: React.Dispatch<React.SetStateAction<Path[]>>;
  setPoints: React.Dispatch<React.SetStateAction<Point[]>>;
  onStrokeEnd: (strokePoints: Point[]) => void;
  width?: number;
  height?: number;
}

// MediaPipe hand connections mapping for skeleton rendering
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8], // Index
  [0, 9], [9, 10], [10, 11], [11, 12], // Middle
  [0, 13], [13, 14], [14, 15], [15, 16], // Ring
  [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
  [5, 9], [9, 13], [13, 17] // Palm base connection
];

export const Canvas = React.forwardRef<HTMLCanvasElement, CanvasProps>(({
  videoRef,
  showWebcam,
  webcamOpacity,
  mirrorCamera,
  hands,
  cursor,
  smoothedPoint,
  gesture,
  brushColor,
  brushSize,
  brushOpacity,
  activeTool,
  paths,
  points,
  setPaths,
  setPoints,
  onStrokeEnd,
  width = 640,
  height = 480
}, ref) => {
  const drawingCanvasRef = (ref as React.RefObject<HTMLCanvasElement>) || useRef<HTMLCanvasElement | null>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [prevGesture, setPrevGesture] = useState<Gesture>('PAUSE');
  const pointsRef = useRef<Point[]>([]);

  // Keep pointsRef in sync with points prop to prevent stale closure bugs
  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  // --- 1. RENDER DRAWINGS ON DRAWING CANVAS ---
  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (mirrorCamera) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    const drawPath = (path: Path) => {
      const pts = path.points;
      if (pts.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);

      // Save general state
      ctx.save();
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Apply brush tool styles
      if (path.tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.strokeStyle = 'rgba(0,0,0,1)';
      } else if (path.tool === 'marker') {
        ctx.globalAlpha = path.opacity * 0.45;
      } else if (path.tool === 'neon') {
        ctx.globalAlpha = path.opacity;
        ctx.shadowColor = path.color;
        ctx.shadowBlur = path.size * 1.5;
        // Draw inner white-ish line to make it look hot neon
        ctx.strokeStyle = '#ffffff';
      } else {
        ctx.globalAlpha = path.opacity;
      }

      // Draw path lines
      if (path.tool === 'calligraphy') {
        // Calligraphy mode draws custom rectangles or thickness depending on velocity/angle
        for (let i = 1; i < pts.length; i++) {
          const pt1 = pts[i - 1];
          const pt2 = pts[i];
          
          // Calculate angle
          const dx = pt2.x - pt1.x;
          const dy = pt2.y - pt1.y;
          const angle = Math.atan2(dy, dx);
          
          // Calligraphy tilt thickness factor
          const factor = 0.3 + 1.2 * Math.abs(Math.sin(angle - Math.PI/4));
          
          ctx.beginPath();
          ctx.moveTo(pt1.x, pt1.y);
          ctx.lineWidth = path.size * factor;
          ctx.lineTo(pt2.x, pt2.y);
          ctx.stroke();
        }
      } else {
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
      }

      ctx.restore();
    };

    // Render historical paths
    paths.forEach(drawPath);

    // Render active drawing path
    if (points.length > 0) {
      drawPath({
        points,
        color: brushColor,
        size: brushSize,
        opacity: brushOpacity,
        tool: activeTool
      });
    }
    ctx.restore();
  }, [paths, points, brushColor, brushSize, brushOpacity, activeTool, mirrorCamera]);

  // --- 2. GESTURE & STROKE STATE MANAGEMENT ---
  useEffect(() => {
    // Detect stroke end (when user changes gesture away from DRAW or stops tracking)
    if (prevGesture === 'DRAW' && gesture !== 'DRAW') {
      const currentPoints = pointsRef.current;
      if (currentPoints.length > 2) {
        // Save current stroke to path list
        const newPath: Path = {
          points: [...currentPoints],
          color: brushColor,
          size: brushSize,
          opacity: brushOpacity,
          tool: activeTool
        };
        setPaths((prev) => [...prev, newPath]);
        
        // Notify parent to run shape auto-correction / OCR
        onStrokeEnd([...currentPoints]);
      }
      setPoints([]);
    }

    // Append drawing coordinate to current stroke
    if (gesture === 'DRAW' && smoothedPoint) {
      setPoints((prev) => [...prev, smoothedPoint]);
    }

    setPrevGesture(gesture);
  }, [gesture, smoothedPoint, prevGesture, brushColor, brushSize, brushOpacity, activeTool, onStrokeEnd, setPaths, setPoints]);

  // --- 3. RENDER HUD OVERLAYS (SKELETON & CURSORS) ON UI CANVAS ---
  useEffect(() => {
    const canvas = uiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Mirror everything drawn on the UI Canvas (both joints AND cursor!)
    if (mirrorCamera) {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    // A. Render Hand Skeleton Nodes
    hands.forEach((hand) => {
      // Draw connection lines
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)'; // soft emerald
      ctx.lineWidth = 2.5;
      HAND_CONNECTIONS.forEach(([i, j]) => {
        const pt1 = hand.landmarks[i];
        const pt2 = hand.landmarks[j];
        if (pt1 && pt2) {
          ctx.beginPath();
          ctx.moveTo(pt1[0] * canvas.width, pt1[1] * canvas.height);
          ctx.lineTo(pt2[0] * canvas.width, pt2[1] * canvas.height);
          ctx.stroke();
        }
      });

      // Draw joint dots
      hand.landmarks.forEach((lm, idx) => {
        ctx.beginPath();
        const px = lm[0] * canvas.width;
        const py = lm[1] * canvas.height;
        ctx.arc(px, py, idx === 8 ? 6 : idx === 4 ? 6 : 4, 0, 2 * Math.PI);
        
        // Color fingertips differently
        if (idx === 8) {
          ctx.fillStyle = '#c084fc'; // purple fingertip (Index)
        } else if (idx === 4) {
          ctx.fillStyle = '#f59e0b'; // amber fingertip (Thumb)
        } else {
          ctx.fillStyle = '#34d399'; // emerald joints
        }
        ctx.fill();
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 1;
        ctx.stroke();
      });
    });

    // B. Draw Virtual Cursor
    if (cursor) {
      // Map colors depending on active tool/gesture
      let cursorColor = brushColor;
      let cursorRadius = Math.max(8, brushSize / 2);
      
      if (activeTool === 'eraser' || gesture === 'ERASER') {
        cursorColor = '#f43f5e'; // red eraser ring
        cursorRadius = 16;
      } else if (gesture === 'MOVE_CURSOR') {
        cursorColor = '#38bdf8'; // sky blue pointer
        cursorRadius = 8;
      } else if (gesture === 'SELECT') {
        cursorColor = '#fbbf24'; // amber click
        cursorRadius = 12;
      }

      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, cursorRadius, 0, 2 * Math.PI);
      
      if (gesture === 'SELECT') {
        // Draw solid glowing select circle
        ctx.fillStyle = 'rgba(251, 191, 36, 0.4)';
        ctx.fill();
      }

      ctx.strokeStyle = cursorColor;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Outer rings/crosshairs for visual polish
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, cursorRadius + 4, 0, 2 * Math.PI);
      ctx.strokeStyle = `${cursorColor}22`; // highly transparent outer border
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    ctx.restore();
  }, [hands, cursor, gesture, brushColor, brushSize, activeTool, mirrorCamera]);

  return (
    <div 
      className="relative rounded-2xl overflow-hidden shadow-2xl bg-slate-950/80 border border-slate-800/40 w-full select-none"
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      {/* 1. Mirrored Webcam Video Stream (in background) */}
      {showWebcam && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{ 
            opacity: webcamOpacity,
            transform: mirrorCamera ? 'scaleX(-1)' : 'none',
          }}
          className="absolute inset-0 w-full h-full object-fill z-0 transition-opacity duration-300 pointer-events-none"
        />
      )}

      {/* Grid pattern helper */}
      <div className="absolute inset-0 canvas-grid z-5 pointer-events-none" />

      {/* 2. Vector Drawings Render Canvas */}
      <canvas
        ref={drawingCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full z-10 bg-transparent block"
      />

      {/* 3. Skeleton HUD & Air Cursor Canvas */}
      <canvas
        ref={uiCanvasRef}
        width={width}
        height={height}
        className="absolute inset-0 w-full h-full z-20 bg-transparent block pointer-events-none"
      />
    </div>
  );
});

Canvas.displayName = 'Canvas';
