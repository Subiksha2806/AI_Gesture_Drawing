import { useEffect, useState, useRef } from 'react';
import { Cpu, Monitor } from 'lucide-react';

interface FpsCounterProps {
  backendFps: number;
}

export function FpsCounter({ backendFps }: FpsCounterProps) {
  const [frontendFps, setFrontendFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  useEffect(() => {
    let animationId: number;

    const calcFps = () => {
      frameCountRef.current += 1;
      const now = performance.now();
      const delta = now - lastTimeRef.current;

      if (delta >= 1000) {
        setFrontendFps(Math.round((frameCountRef.current * 1000) / delta));
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }

      animationId = requestAnimationFrame(calcFps);
    };

    animationId = requestAnimationFrame(calcFps);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="flex items-center space-x-4 px-3 py-1.5 rounded-full text-xs font-semibold glass-panel select-none">
      {/* Frontend rendering FPS */}
      <div className="flex items-center space-x-1.5 text-indigo-400">
        <Monitor className="w-3.5 h-3.5" />
        <span>UI:</span>
        <span className={frontendFps >= 45 ? 'text-green-400' : 'text-yellow-400'}>
          {frontendFps} FPS
        </span>
      </div>
      
      {/* Divider */}
      <div className="h-3 w-[1px] bg-slate-800" />
      
      {/* Backend computer vision FPS */}
      <div className="flex items-center space-x-1.5 text-emerald-400">
        <Cpu className="w-3.5 h-3.5" />
        <span>AI:</span>
        <span className={backendFps >= 24 ? 'text-green-400' : 'text-yellow-400'}>
          {backendFps} FPS
        </span>
      </div>
    </div>
  );
}
