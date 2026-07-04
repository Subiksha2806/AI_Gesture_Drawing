export interface Point {
  x: number;
  y: number;
}

export type Tool = 'pencil' | 'marker' | 'neon' | 'calligraphy' | 'eraser';

export interface Path {
  points: Point[];
  color: string;
  size: number;
  opacity: number;
  tool: Tool;
}

export interface Hand {
  label: 'Left' | 'Right';
  score: number;
  landmarks: number[][]; // 21 landmarks of [x, y, z]
  bbox: number[]; // [xmin, ymin, xmax, ymax]
}

export type Gesture = 
  | 'DRAW' 
  | 'MOVE_CURSOR' 
  | 'ERASER' 
  | 'SELECT' 
  | 'PAUSE' 
  | 'SAVE' 
  | 'CLEAR_CANVAS';

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
  duration?: number;
}

export interface DrawingHistoryItem {
  filename: string;
  format: string;
  size_bytes: number;
  created_at: number;
}
