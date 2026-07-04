import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Pencil, 
  MousePointer, 
  Eraser, 
  Hand, 
  Download, 
  Trash2, 
  Sparkles
} from 'lucide-react';
import type { Gesture } from '../types/canvas';

interface GestureIndicatorProps {
  gesture: Gesture;
  handsCount: number;
}

const gestureConfigs: Record<Gesture, {
  label: string;
  description: string;
  icon: React.ComponentType<any>;
  colorClass: string;
  bgGlowClass: string;
}> = {
  DRAW: {
    label: 'Drawing Mode',
    description: 'One index finger up',
    icon: Pencil,
    colorClass: 'text-violet-400 border-violet-500/30',
    bgGlowClass: 'bg-violet-500/20'
  },
  MOVE_CURSOR: {
    label: 'Cursor Move',
    description: 'Two fingers up, close together',
    icon: MousePointer,
    colorClass: 'text-sky-400 border-sky-500/30',
    bgGlowClass: 'bg-sky-500/20'
  },
  ERASER: {
    label: 'Eraser Mode',
    description: 'Peace sign (two fingers spread)',
    icon: Eraser,
    colorClass: 'text-rose-400 border-rose-500/30',
    bgGlowClass: 'bg-rose-500/20'
  },
  SELECT: {
    label: 'Select (Pinch)',
    description: 'Index & thumb pinch to click',
    icon: Sparkles,
    colorClass: 'text-amber-400 border-amber-500/30',
    bgGlowClass: 'bg-amber-500/20'
  },
  PAUSE: {
    label: 'Canvas Paused',
    description: 'Open palm to hold drawing',
    icon: Hand,
    colorClass: 'text-slate-400 border-slate-500/30',
    bgGlowClass: 'bg-slate-500/10'
  },
  SAVE: {
    label: 'Saving Image...',
    description: 'Thumb up gesture detected',
    icon: Download,
    colorClass: 'text-emerald-400 border-emerald-500/30',
    bgGlowClass: 'bg-emerald-500/20'
  },
  CLEAR_CANVAS: {
    label: 'Clear Canvas?',
    description: 'Closed fist to open clear prompt',
    icon: Trash2,
    colorClass: 'text-orange-400 border-orange-500/30',
    bgGlowClass: 'bg-orange-500/20'
  }
};

export function GestureIndicator({ gesture, handsCount }: GestureIndicatorProps) {
  const config = gestureConfigs[gesture] || gestureConfigs.PAUSE;
  const Icon = config.icon;

  return (
    <div className="flex flex-col space-y-2 select-none">
      <div className="flex items-center space-x-2 text-[10px] text-slate-400 uppercase tracking-widest font-bold">
        <span>Hand Control Status</span>
        <span className="h-1.5 w-1.5 rounded-full bg-slate-600 animate-pulse" />
        <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
          {handsCount} {handsCount === 1 ? 'Hand' : 'Hands'}
        </span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={gesture}
          initial={{ opacity: 0, y: 10, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className={`flex items-center space-x-3.5 px-4 py-3 border glass-panel relative overflow-hidden ${config.colorClass}`}
        >
          {/* Subtle backdrop glow */}
          <div className={`absolute -right-4 -bottom-4 w-12 h-12 rounded-full blur-xl opacity-60 ${config.bgGlowClass}`} />

          {/* Action Icon */}
          <div className="p-2 rounded-xl bg-slate-950/40 relative">
            <Icon className="w-5 h-5 animate-pulse" />
          </div>

          {/* Texts */}
          <div className="flex-1 min-w-[130px]">
            <h4 className="font-bold text-sm leading-none text-slate-100 mb-0.5">
              {config.label}
            </h4>
            <p className="text-[11px] text-slate-400 font-medium">
              {config.description}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
