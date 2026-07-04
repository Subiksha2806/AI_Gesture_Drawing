import { Sliders, Camera, RotateCw, Sparkles, Mic, Save, Eye, Moon, Sun } from 'lucide-react';

interface SettingsProps {
  emaAlpha: number;
  setEmaAlpha: (val: number) => void;
  showWebcam: boolean;
  setShowWebcam: (val: boolean) => void;
  mirrorCamera: boolean;
  setMirrorCamera: (val: boolean) => void;
  shapeCorrection: boolean;
  setShapeCorrection: (val: boolean) => void;
  voiceCommands: boolean;
  setVoiceCommands: (val: boolean) => void;
  autoSave: boolean;
  setAutoSave: (val: boolean) => void;
  webcamOpacity: number;
  setWebcamOpacity: (val: number) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
}

export function Settings({
  emaAlpha,
  setEmaAlpha,
  showWebcam,
  setShowWebcam,
  mirrorCamera,
  setMirrorCamera,
  shapeCorrection,
  setShapeCorrection,
  voiceCommands,
  setVoiceCommands,
  autoSave,
  setAutoSave,
  webcamOpacity,
  setWebcamOpacity,
  theme,
  setTheme
}: SettingsProps) {
  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    if (newTheme === 'light') {
      document.body.classList.add('light');
    } else {
      document.body.classList.remove('light');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <div className="flex items-center pb-3 border-b border-slate-800/60 mb-5">
        <div>
          <h3 className="font-bold text-slate-100 text-sm">Control Panel</h3>
          <p className="text-[10px] text-slate-400">Customize canvas and tracking</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-5.5 text-xs font-semibold">
        {/* Theme Settings */}
        <div className="space-y-2">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">App Style</label>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border glass-card hover:border-brand-500/30 transition-all"
          >
            <span className="flex items-center space-x-2">
              {theme === 'dark' ? <Moon className="w-4 h-4 text-violet-400" /> : <Sun className="w-4 h-4 text-amber-500" />}
              <span className="text-slate-200">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded">
              Switch
            </span>
          </button>
        </div>

        {/* Video Controls */}
        <div className="space-y-3">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Camera Feed</label>
          
          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2 text-slate-300">
              <Camera className="w-4 h-4 text-violet-400" />
              <span>Show Webcam Feed</span>
            </span>
            <input
              type="checkbox"
              checked={showWebcam}
              onChange={(e) => setShowWebcam(e.target.checked)}
              className="w-4 h-4 accent-brand-500 cursor-pointer"
            />
          </div>

          {showWebcam && (
            <div className="space-y-1.5 pl-6">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span>Feed Opacity</span>
                <span>{Math.round(webcamOpacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.8"
                step="0.05"
                value={webcamOpacity}
                onChange={(e) => setWebcamOpacity(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2 text-slate-300">
              <RotateCw className="w-4 h-4 text-violet-400" />
              <span>Mirror Camera View</span>
            </span>
            <input
              type="checkbox"
              checked={mirrorCamera}
              onChange={(e) => setMirrorCamera(e.target.checked)}
              className="w-4 h-4 accent-brand-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Tracking Filter Smoothness */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold flex items-center space-x-1">
              <Sliders className="w-3.5 h-3.5" />
              <span>Drawing Smoothing</span>
            </label>
            <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">
              {Math.round((1 - emaAlpha) * 100)}%
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-normal font-normal">
            Higher smoothing reduces finger-shake/jitter but adds slight follow latency.
          </p>
          <input
            type="range"
            min="0.1"
            max="0.9"
            step="0.05"
            value={emaAlpha}
            onChange={(e) => setEmaAlpha(parseFloat(e.target.value))}
            className="w-full mt-1.5"
          />
        </div>

        {/* AI Assistants */}
        <div className="space-y-3">
          <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Smart Features</label>

          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2 text-slate-300">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>Shape Auto-correction</span>
            </span>
            <input
              type="checkbox"
              checked={shapeCorrection}
              onChange={(e) => setShapeCorrection(e.target.checked)}
              className="w-4 h-4 accent-brand-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2 text-slate-300">
              <Mic className="w-4 h-4 text-violet-400" />
              <span>Voice Commands</span>
            </span>
            <input
              type="checkbox"
              checked={voiceCommands}
              onChange={(e) => setVoiceCommands(e.target.checked)}
              className="w-4 h-4 accent-brand-500 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="flex items-center space-x-2 text-slate-300">
              <Save className="w-4 h-4 text-violet-400" />
              <span>Auto-save (1 min)</span>
            </span>
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(e) => setAutoSave(e.target.checked)}
              className="w-4 h-4 accent-brand-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Keyboard Shortcuts Quick Guide */}
        <div className="p-3 bg-slate-950/40 border border-slate-900 rounded-xl space-y-1.5">
          <h4 className="text-[10px] text-slate-400 uppercase font-black tracking-wider flex items-center space-x-1.5">
            <Eye className="w-3 h-3 text-brand-400" />
            <span>Voice commands cheatsheet</span>
          </h4>
          <ul className="text-[9.5px] text-slate-400 font-medium space-y-1 pl-1 list-disc list-inside">
            <li>"Use Eraser" / "Use Marker"</li>
            <li>"Color Red" / "Color Blue"</li>
            <li>"Brush Size 20"</li>
            <li>"Undo" / "Redo" / "Clear Canvas"</li>
            <li>"Save drawing"</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
