import React from 'react';
import { 
  Pencil, 
  Paintbrush, 
  Eraser, 
  Undo2, 
  Redo2, 
  Trash2, 
  Download, 
  FileDown,
  FileCode,
  Maximize, 
  Minimize,
  Sparkles,
  Award
} from 'lucide-react';
import type { Tool } from '../types/canvas';

interface ToolbarProps {
  activeTool: Tool;
  setActiveTool: (tool: Tool) => void;
  brushColor: string;
  setBrushColor: (color: string) => void;
  brushSize: number;
  setBrushSize: (size: number) => void;
  brushOpacity: number;
  setBrushOpacity: (opacity: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onSave: (format: 'png' | 'jpg' | 'pdf' | 'svg') => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
  airHoveredId: string | null;
}

const colorPresets = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#eab308', // Yellow
  '#10b981', // Green
  '#3b82f6', // Blue
  '#a855f7', // Purple
  '#ec4899', // Pink
  '#ffffff', // White
  '#000000', // Black
];

const toolsConfig: { id: Tool; label: string; icon: React.ComponentType<any>; desc: string }[] = [
  { id: 'pencil', label: 'Pencil', icon: Pencil, desc: 'Solid fine stroke' },
  { id: 'marker', label: 'Marker', icon: Paintbrush, desc: 'Semi-transparent wide' },
  { id: 'neon', label: 'Neon Glow', icon: Sparkles, desc: 'Outer shadow glow' },
  { id: 'calligraphy', label: 'Calligraphy', icon: Award, desc: 'Angle-sensitive width' },
  { id: 'eraser', label: 'Eraser', icon: Eraser, desc: 'Clear drawing strokes' },
];

export function Toolbar({
  activeTool,
  setActiveTool,
  brushColor,
  setBrushColor,
  brushSize,
  setBrushSize,
  brushOpacity,
  setBrushOpacity,
  onUndo,
  onRedo,
  onClear,
  onSave,
  isFullscreen,
  toggleFullscreen,
  airHoveredId,
}: ToolbarProps) {
  
  // Helper to determine if a button is air-hovered
  const getAirHoverClass = (btnId: string) => {
    return airHoveredId === btnId 
      ? 'ring-4 ring-violet-500 ring-offset-2 ring-offset-slate-950 scale-105 shadow-violet-500/20' 
      : '';
  };

  return (
    <div className="flex flex-col md:flex-row items-stretch md:items-center space-y-4 md:space-y-0 md:space-x-5 p-4 w-full glass-panel border border-slate-800/40 relative select-none">
      
      {/* 1. BRUSH MODE SWITCHERS */}
      <div className="flex flex-wrap gap-1.5 border-b md:border-b-0 md:border-r border-slate-800/60 pb-3 md:pb-0 md:pr-4">
        {toolsConfig.map((t) => {
          const Icon = t.icon;
          const isActive = activeTool === t.id;
          const airId = `tool-${t.id}`;
          return (
            <button
              key={t.id}
              id={airId}
              onClick={() => setActiveTool(t.id)}
              className={`p-2.5 rounded-xl flex flex-col items-center justify-center transition-all ${getAirHoverClass(airId)} ${
                isActive 
                  ? 'bg-brand-600 text-slate-100 shadow-lg shadow-brand-500/10' 
                  : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-slate-800/40 hover:bg-slate-800/40'
              }`}
              title={`${t.label}: ${t.desc}`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[9px] font-bold mt-1 leading-none">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* 2. COLOR PALETTE */}
      {activeTool !== 'eraser' && (
        <div className="flex flex-col space-y-1.5 border-b md:border-b-0 md:border-r border-slate-800/60 pb-3 md:pb-0 md:pr-4">
          <span className="text-[9px] text-slate-400 uppercase tracking-widest font-black">Colors</span>
          <div className="flex items-center space-x-1.5">
            <div className="flex flex-wrap gap-1 max-w-[130px]">
              {colorPresets.map((c) => {
                const isSelected = brushColor === c;
                const airId = `color-${c.replace('#', '')}`;
                return (
                  <button
                    key={c}
                    id={airId}
                    onClick={() => setBrushColor(c)}
                    style={{ backgroundColor: c }}
                    className={`w-4 h-4 rounded-full border border-slate-950/20 transition-transform hover:scale-115 ${getAirHoverClass(airId)} ${
                      isSelected ? 'ring-2 ring-brand-500 scale-110 shadow-sm' : ''
                    }`}
                  />
                );
              })}
            </div>
            
            {/* Custom Color Picker Button */}
            <div className="relative">
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-7 h-7 rounded-lg border border-slate-800/60 bg-transparent p-0 cursor-pointer"
                title="Custom color picker"
              />
            </div>
          </div>
        </div>
      )}

      {/* 3. SIZE & OPACITY SLIDERS */}
      <div className="flex-1 flex flex-col md:flex-row space-y-3.5 md:space-y-0 md:space-x-5 border-b md:border-b-0 md:border-r border-slate-800/60 pb-3 md:pb-0 md:pr-4">
        {/* Size Slider */}
        <div className="flex-1 flex flex-col space-y-1.5 justify-center">
          <div className="flex justify-between text-[9px] text-slate-400 uppercase tracking-widest font-black">
            <span>Size</span>
            <span>{brushSize}px</span>
          </div>
          <input
            type="range"
            min="1"
            max="80"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value))}
            className="w-full"
          />
        </div>

        {/* Opacity Slider (hidden for eraser) */}
        {activeTool !== 'eraser' && (
          <div className="flex-1 flex flex-col space-y-1.5 justify-center">
            <div className="flex justify-between text-[9px] text-slate-400 uppercase tracking-widest font-black">
              <span>Opacity</span>
              <span>{Math.round(brushOpacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={brushOpacity}
              onChange={(e) => setBrushOpacity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        )}
      </div>

      {/* 4. CANVAS STATE OPERATIONS & EXPORTS */}
      <div className="flex flex-wrap items-center justify-between md:justify-end gap-1.5">
        {/* Undo / Redo */}
        <div className="flex space-x-1 border-r border-slate-800/60 pr-1.5">
          <button
            id="btn-undo"
            onClick={onUndo}
            className={`p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all hover:bg-slate-800/30 ${getAirHoverClass('btn-undo')}`}
            title="Undo stroke"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            id="btn-redo"
            onClick={onRedo}
            className={`p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-slate-400 hover:text-slate-200 transition-all hover:bg-slate-800/30 ${getAirHoverClass('btn-redo')}`}
            title="Redo stroke"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        {/* Clear */}
        <button
          id="btn-clear"
          onClick={onClear}
          className={`p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all ${getAirHoverClass('btn-clear')}`}
          title="Clear canvas (Closed fist confirmation)"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Exports */}
        <div className="flex space-x-1 pl-1.5 border-l border-slate-800/60">
          <button
            id="btn-save-png"
            onClick={() => onSave('png')}
            className={`p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all ${getAirHoverClass('btn-save-png')}`}
            title="Save PNG image"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            id="btn-save-pdf"
            onClick={() => onSave('pdf')}
            className={`p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all ${getAirHoverClass('btn-save-pdf')}`}
            title="Export PDF Document"
          >
            <FileDown className="w-4 h-4" />
          </button>

          <button
            id="btn-save-svg"
            onClick={() => onSave('svg')}
            className={`p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all ${getAirHoverClass('btn-save-svg')}`}
            title="Export SVG Vector File"
          >
            <FileCode className="w-4 h-4" />
          </button>
        </div>

        {/* Fullscreen */}
        <button
          id="btn-fullscreen"
          onClick={toggleFullscreen}
          className={`p-2 rounded-lg bg-slate-900/40 border border-slate-800 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10 hover:border-sky-500/30 transition-all ${getAirHoverClass('btn-fullscreen')}`}
          title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
