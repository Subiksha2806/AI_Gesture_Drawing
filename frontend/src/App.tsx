import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Palette,
  RefreshCw, 
  Copy, 
  Trash, 
  Type,
  Volume2
} from 'lucide-react';
import { Canvas } from './components/Canvas';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { Settings } from './components/Settings';
import { HistoryPanel } from './components/HistoryPanel';
import { FpsCounter } from './components/FpsCounter';
import { GestureIndicator } from './components/GestureIndicator';
import { NotificationSystem } from './components/NotificationSystem';

import { useWebcam } from './hooks/useWebcam';
import { useWebSocket } from './hooks/useWebSocket';
import type { Point, Path, Tool, Gesture, Notification } from './types/canvas';

export default function App() {
  // --- 1. CORE APPLICATION STATE ---
  const [activeTool, setActiveTool] = useState<Tool>('pencil');
  const [brushColor, setBrushColor] = useState<string>('#a855f7'); // default purple
  const [brushSize, setBrushSize] = useState<number>(6);
  const [brushOpacity, setBrushOpacity] = useState<number>(1.0);
  
  // Canvas drawing states
  const [paths, setPaths] = useState<Path[]>([]);
  const [points, setPoints] = useState<Point[]>([]);
  const [undoStack, setUndoStack] = useState<Path[][]>([]);
  const [redoStack, setRedoStack] = useState<Path[][]>([]);

  // Webcam & UI configs
  const [showWebcam, setShowWebcam] = useState<boolean>(true);
  const [webcamOpacity, setWebcamOpacity] = useState<number>(0.25);
  const [mirrorCamera, setMirrorCamera] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // AI & Smart Assist features
  const [shapeCorrection, setShapeCorrection] = useState<boolean>(true);
  const [voiceCommands, setVoiceCommands] = useState<boolean>(true);
  const [autoSave, setAutoSave] = useState<boolean>(true);
  const [emaAlpha, setEmaAlpha] = useState<number>(0.55); // smoothing
  const [ocrResult, setOcrResult] = useState<string | null>(null);
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);

  // Real-time tracking feeds
  const [hands, setHands] = useState<any[]>([]);
  const [gesture, setGesture] = useState<Gesture>('PAUSE');
  const [cursor, setCursor] = useState<Point | null>(null);
  const [smoothedPoint, setSmoothedPoint] = useState<Point | null>(null);
  const [backendFps, setBackendFps] = useState<number>(0);
  const [refreshHistoryTrigger, setRefreshHistoryTrigger] = useState<number>(0);

  // Air Gesture Click Hover states
  const [airHoveredId, setAirHoveredId] = useState<string | null>(null);
  const clickCooldownRef = useRef<boolean>(false);

  // References
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Notifications
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((message: string, type: 'success' | 'info' | 'warning' | 'error') => {
    const id = Math.random().toString(36).substring(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove notification after 4 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 4000);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // --- 2. WEBCAM FEED INITIALIZATION ---
  const { videoRef } = useWebcam({ width: 640, height: 480 });

  // --- 3. CANVAS OPERATIONS ---
  const saveStateToUndo = useCallback((currentPaths: Path[]) => {
    setUndoStack((prev) => [...prev, currentPaths]);
    setRedoStack([]); // Clear redo stack on new action
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, paths]);
    setPaths(previous);
    addNotification('Undo stroke', 'info');
  }, [undoStack, paths, addNotification]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, paths]);
    setPaths(next);
    addNotification('Redo stroke', 'info');
  }, [redoStack, paths, addNotification]);

  const handleClear = useCallback(() => {
    saveStateToUndo(paths);
    setPaths([]);
    setPoints([]);
    setOcrResult(null);
    addNotification('Canvas cleared', 'info');
  }, [paths, saveStateToUndo, addNotification]);

  // Fullscreen support
  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // --- 4. WEBSOCKET CALLBACK HANDLERS ---
  const handleFrameResponse = useCallback((data: any) => {
    setHands(data.hands);
    setGesture(data.gesture);
    setBackendFps(data.fps);

    const canvas = canvasRef.current;
    const w = canvas?.width || 720;
    const h = canvas?.height || 480;

    if (data.cursor) {
      setCursor({
        x: data.cursor.x * w,
        y: data.cursor.y * h
      });
    } else {
      setCursor(null);
    }

    if (data.smoothed_point) {
      setSmoothedPoint({
        x: data.smoothed_point.x * w,
        y: data.smoothed_point.y * h
      });
    } else {
      setSmoothedPoint(null);
    }
  }, []);

  const handleVoiceCommand = useCallback((data: any) => {
    const cmd = data.command;
    console.log("Voice action parsed:", cmd);
    
    switch (cmd.action) {
      case 'SET_TOOL':
        setActiveTool(cmd.value);
        addNotification(`Voice command: Tool set to ${cmd.value}`, 'success');
        break;
      case 'SET_COLOR':
        setBrushColor(cmd.value);
        addNotification(`Voice command: Color changed`, 'success');
        break;
      case 'SET_SIZE':
        setBrushSize(cmd.value);
        addNotification(`Voice command: Size set to ${cmd.value}px`, 'success');
        break;
      case 'UNDO':
        handleUndo();
        break;
      case 'REDO':
        handleRedo();
        break;
      case 'CLEAR_CONFIRM':
        handleClear();
        break;
      case 'SAVE':
        triggerSaveExport('png');
        break;
      default:
        break;
    }
  }, [handleUndo, handleRedo, handleClear, addNotification]);

  const handleShapeCorrected = useCallback((data: any) => {
    const corrected = data.result;
    if (!corrected) return;

    addNotification(`Auto-corrected drawn stroke to a ${corrected.type}!`, 'success');
    
    setPaths((prev) => {
      if (prev.length === 0) return prev;
      const updated = [...prev];
      const lastIdx = updated.length - 1;

      let correctedPts: Point[] = [];

      if (corrected.type === 'circle') {
        const center = corrected.center;
        const r = corrected.radius;
        // Generate circular polygon vertices
        for (let i = 0; i <= 36; i++) {
          const angle = (i * 10 * Math.PI) / 180;
          correctedPts.push({
            x: center.x + r * Math.cos(angle),
            y: center.y + r * Math.sin(angle)
          });
        }
      } else {
        // Line, Square, Rectangle, Triangle, Arrow, Star have point coordinates directly
        correctedPts = corrected.points;
      }

      // Replace the points of the last path with perfected shape coords
      updated[lastIdx] = {
        ...updated[lastIdx],
        points: correctedPts
      };
      return updated;
    });
  }, [addNotification]);

  const handleOcrResponse = useCallback((data: any) => {
    setIsOcrProcessing(false);
    if (data.text) {
      setOcrResult(data.text);
      addNotification('Handwriting OCR completed!', 'success');
    } else {
      addNotification('Could not recognize handwriting. Try drawing clearer letters.', 'warning');
    }
  }, [addNotification]);

  const handleSaveResponse = useCallback((data: any) => {
    if (data.status === 'success') {
      addNotification(`Drawing saved to gallery: ${data.filename}`, 'success');
      setRefreshHistoryTrigger((prev) => prev + 1);
    } else {
      addNotification(`Save failed: ${data.message}`, 'error');
    }
  }, [addNotification]);

  // --- 5. WEBSOCKET HOOK ---
  const { 
    status: wsStatus,
    sendSettings,
    sendDetectShape,
    sendOcrRequest,
    sendVoiceTranscript,
    sendSaveRequest
  } = useWebSocket({
    videoRef,
    onFrameResponse: handleFrameResponse,
    onVoiceCommand: handleVoiceCommand,
    onShapeCorrected: handleShapeCorrected,
    onOcrResponse: handleOcrResponse,
    onSaveResponse: handleSaveResponse
  });

  // --- 6. EXPORTS AND REST API WRITING ---
  const triggerSaveExport = useCallback(async (format: 'png' | 'jpg' | 'pdf' | 'svg') => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (format === 'svg') {
      // SVG vector export runs completely on backend from vector paths
      try {
        const res = await fetch('http://localhost:8000/api/export/svg', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ paths, width: canvas.width, height: canvas.height })
        });
        if (res.ok) {
          const data = await res.json();
          addNotification(`Exported vector SVG successfully!`, 'success');
          setRefreshHistoryTrigger((prev) => prev + 1);
          window.open(`http://localhost:8000/static/${data.filename}`, '_blank');
        }
      } catch (e) {
        addNotification('SVG export failed', 'error');
      }
      return;
    }

    // For PNG, JPG, and PDF, we render a solid background color if transparent,
    // export to base64, and transmit it to backend
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Fill background color based on theme for clean viewing (unless transparent PNG is desired)
    // Here we fill a solid background for clear contrast exports
    tempCtx.fillStyle = theme === 'dark' ? '#0f172a' : '#f8fafc';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
    
    // Draw the drawings onto the temporary canvas
    tempCtx.drawImage(canvas, 0, 0);
    const base64Data = tempCanvas.toDataURL('image/png');

    if (format === 'pdf') {
      try {
        const res = await fetch('http://localhost:8000/api/export/pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Data })
        });
        if (res.ok) {
          const data = await res.json();
          addNotification('Exported PDF Document!', 'success');
          setRefreshHistoryTrigger((prev) => prev + 1);
          window.open(`http://localhost:8000/static/${data.filename}`, '_blank');
        }
      } catch (e) {
        addNotification('PDF export failed', 'error');
      }
    } else {
      // Send save PNG/JPG request via websocket
      sendSaveRequest(base64Data, format);
    }
  }, [paths, theme, sendSaveRequest, addNotification]);

  // Handwriting OCR Trigger
  const triggerOcrRecognition = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || paths.length === 0) {
      addNotification('Draw something on the canvas first!', 'warning');
      return;
    }
    
    setIsOcrProcessing(true);
    // Grab cropped base64 drawing
    const base64Data = canvas.toDataURL('image/png');
    sendOcrRequest(base64Data);
    addNotification('Running handwriting OCR...', 'info');
  }, [paths, sendOcrRequest, addNotification]);

  // Keep backend settings synchronized with slider values
  useEffect(() => {
    if (wsStatus === 'connected') {
      sendSettings(emaAlpha);
    }
  }, [emaAlpha, wsStatus, sendSettings]);

  // --- 7. BROWSER WEB SPEECH RECOGNITION ---
  useEffect(() => {
    if (!voiceCommands) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const lastResultIdx = event.results.length - 1;
      const transcript = event.results[lastResultIdx][0].transcript;
      if (transcript && wsStatus === 'connected') {
        sendVoiceTranscript(transcript);
      }
    };

    recognition.onerror = (e: any) => {
      console.error("Speech recognition error:", e);
    };

    recognition.onend = () => {
      // Auto-restart speech listener if toggled active
      if (voiceCommands) {
        try {
          recognition.start();
        } catch (err) {}
      }
    };

    try {
      recognition.start();
    } catch (err) {}

    return () => {
      recognition.onresult = null;
      recognition.onend = null;
      recognition.onerror = null;
      try {
        recognition.stop();
      } catch (err) {}
    };
  }, [voiceCommands, wsStatus, sendVoiceTranscript]);

  // --- 8. AUTO-SAVE INTERVAL (1 minute) ---
  useEffect(() => {
    if (!autoSave || paths.length === 0) return;

    const timer = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas && wsStatus === 'connected') {
        const base64Data = canvas.toDataURL('image/png');
        sendSaveRequest(base64Data, 'png');
      }
    }, 60000); // every 60 seconds

    return () => clearInterval(timer);
  }, [autoSave, paths, wsStatus, sendSaveRequest]);

  // --- 9. GEOMETRIC SHAPE RECOGNITION HANDLER ---
  const handleStrokeEnd = (strokePoints: Point[]) => {
    // Record current layout to undo stack
    // Make sure we save the state prior to adding the new path (the canvas component saves the paths)
    saveStateToUndo([...paths]);

    if (shapeCorrection && wsStatus === 'connected') {
      const canvas = canvasRef.current;
      const w = canvas?.width || 640;
      const h = canvas?.height || 480;
      sendDetectShape(strokePoints, w, h);
    }
  };

  // --- 10. TOUCH-FREE INTERACTIVE AIR CLICKS (HOVER AND PINCH) ---
  useEffect(() => {
    if (!cursor || hands.length === 0) {
      setAirHoveredId(null);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Calculate viewport coordinates of the cursor
    // Since the camera is visually mirrored, horizontal position must map to mirrored screen coordinate
    const rect = canvas.getBoundingClientRect();
    const rx = mirrorCamera ? (1 - cursor.x / canvas.width) : (cursor.x / canvas.width);
    const ry = cursor.y / canvas.height;
    const screenX = rect.left + rx * rect.width;
    const screenY = rect.top + ry * rect.height;

    // Find all air-interactive button elements
    const elements = document.querySelectorAll('[id^="tool-"], [id^="color-"], [id^="btn-"]');
    let foundHover: string | null = null;

    elements.forEach((el) => {
      const elRect = el.getBoundingClientRect();
      if (
        screenX >= elRect.left &&
        screenX <= elRect.right &&
        screenY >= elRect.top &&
        screenY <= elRect.bottom
      ) {
        foundHover = el.id;
      }
    });

    setAirHoveredId(foundHover);

    // If gesture is SELECT (pinch click) and we are hovering over an element, trigger click!
    if (gesture === 'SELECT' && foundHover && !clickCooldownRef.current) {
      const buttonEl = document.getElementById(foundHover);
      if (buttonEl) {
        // Enforce clicking and feedback
        clickCooldownRef.current = true;
        buttonEl.click();
        
        // Cooldown timer to prevent rapid duplicate double-clicks
        setTimeout(() => {
          clickCooldownRef.current = false;
        }, 1000);
      }
    }
  }, [cursor, gesture, hands]);

  return (
    <div 
      ref={containerRef}
      className={`min-h-screen w-screen flex flex-col md:flex-row items-stretch select-none relative overflow-hidden transition-colors duration-300 ${
        theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'
      }`}
    >
      
      {/* A. NOTIFICATION TOAST SYSTEM */}
      <NotificationSystem notifications={notifications} onRemove={removeNotification} />

      {/* B. MAIN CONTROL SIDEBAR */}
      <Sidebar>
        {(activeTab) => (
          activeTab === 'settings' ? (
            <Settings
              emaAlpha={emaAlpha}
              setEmaAlpha={setEmaAlpha}
              showWebcam={showWebcam}
              setShowWebcam={setShowWebcam}
              mirrorCamera={mirrorCamera}
              setMirrorCamera={setMirrorCamera}
              shapeCorrection={shapeCorrection}
              setShapeCorrection={setShapeCorrection}
              voiceCommands={voiceCommands}
              setVoiceCommands={setVoiceCommands}
              autoSave={autoSave}
              setAutoSave={setAutoSave}
              webcamOpacity={webcamOpacity}
              setWebcamOpacity={setWebcamOpacity}
              theme={theme}
              setTheme={setTheme}
            />
          ) : (
            <HistoryPanel
              onNotify={addNotification}
              refreshTrigger={refreshHistoryTrigger}
            />
          )
        )}
      </Sidebar>

      {/* C. DRAWING STUDIO DASHBOARD */}
      <div className="flex-1 flex flex-col items-center justify-between p-4 md:p-6 space-y-4 md:space-y-6 overflow-hidden relative z-0">
        
        {/* Studio Top Info Bar */}
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-violet-600 text-slate-100 shadow-md">
              <Palette className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-extrabold text-sm md:text-base leading-none tracking-tight">
                AI Air Studio
              </h1>
              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                Real-time gesture drawing board
              </p>
            </div>
          </div>

          {/* Connection Status & FPS overlays */}
          <div className="flex items-center space-x-3">
            {/* WebSocket Connection Status Pill */}
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold glass-panel">
              <span className={`h-2 w-2 rounded-full ${
                wsStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                wsStatus === 'connecting' ? 'bg-yellow-500 animate-spin' :
                'bg-rose-500'
              }`} />
              <span className="capitalize text-slate-300">
                {wsStatus === 'connected' ? 'Studio Online' : 
                 wsStatus === 'connecting' ? 'Connecting...' : 
                 'Offline (Retry)'}
              </span>
            </div>

            {/* FPS counter overlay */}
            {wsStatus === 'connected' && <FpsCounter backendFps={backendFps} />}
          </div>
        </div>

        {/* Studio Drawing Board Layout */}
        <div className="flex-1 flex items-center justify-center w-full min-h-0 relative">
          <Canvas
            ref={canvasRef}
            videoRef={videoRef}
            showWebcam={showWebcam}
            webcamOpacity={webcamOpacity}
            mirrorCamera={mirrorCamera}
            hands={hands}
            cursor={cursor}
            smoothedPoint={smoothedPoint}
            gesture={gesture}
            brushColor={brushColor}
            brushSize={brushSize}
            brushOpacity={brushOpacity}
            activeTool={activeTool}
            paths={paths}
            points={points}
            setPaths={setPaths}
            setPoints={setPoints}
            onStrokeEnd={handleStrokeEnd}
            width={720}
            height={480}
          />

          {/* Gesture Floating Assist Overlay HUD */}
          <div className="absolute bottom-4 left-4 z-30">
            {wsStatus === 'connected' && (
              <GestureIndicator gesture={gesture} handsCount={hands.length} />
            )}
          </div>

          {/* Handwriting Text OCR Display HUD */}
          {ocrResult && (
            <div className="absolute top-4 right-4 max-w-xs p-4 glass-panel border border-brand-500/20 shadow-xl flex flex-col space-y-2 z-30 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-brand-400 uppercase tracking-widest font-black flex items-center space-x-1">
                  <Type className="w-3.5 h-3.5" />
                  <span>Handwritten Text</span>
                </span>
                <button
                  onClick={() => setOcrResult(null)}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-1"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>
              <p className="bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 text-sm font-semibold text-slate-100 leading-relaxed italic select-text">
                "{ocrResult}"
              </p>
              <div className="flex space-x-1.5">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(ocrResult);
                    addNotification('Copied recognized text to clipboard!', 'success');
                  }}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-brand-600 hover:bg-brand-700 transition-colors text-[10px] font-black text-slate-100 flex items-center justify-center space-x-1"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy Text</span>
                </button>
              </div>
            </div>
          )}

          {/* Loader Overlay for OCR */}
          {isOcrProcessing && (
            <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center rounded-2xl z-30">
              <div className="flex flex-col items-center space-y-3 p-6 glass-panel border border-brand-500/20 shadow-lg text-center">
                <RefreshCw className="w-8 h-8 text-brand-500 animate-spin" />
                <h3 className="text-xs font-bold text-slate-200">Recognizing handwriting...</h3>
                <p className="text-[10px] text-slate-400 max-w-[150px] leading-normal font-medium">
                  Transcribing shapes to characters
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Studio Control Toolbar Panel */}
        <div className="w-full max-w-4xl">
          <Toolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            brushColor={brushColor}
            setBrushColor={setBrushColor}
            brushSize={brushSize}
            setBrushSize={setBrushSize}
            brushOpacity={brushOpacity}
            setBrushOpacity={setBrushOpacity}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onClear={handleClear}
            onSave={triggerSaveExport}
            isFullscreen={isFullscreen}
            toggleFullscreen={toggleFullscreen}
            airHoveredId={airHoveredId}
          />
        </div>

        {/* Studio Bottom Status bar */}
        <div className="w-full flex flex-col md:flex-row items-center justify-between text-[10px] text-slate-500 font-semibold space-y-2 md:space-y-0">
          <div className="flex items-center space-x-1">
            <Volume2 className="w-3 h-3 text-brand-500" />
            <span>Voice command listening active: say "Use Eraser", "Color Blue", "Undo"</span>
          </div>

          <div className="flex items-center space-x-3.5">
            <button
              onClick={triggerOcrRecognition}
              className="text-brand-400 hover:text-brand-300 font-bold transition-colors flex items-center space-x-1"
              title="Recognize handwriting from drawing"
            >
              <Type className="w-3.5 h-3.5" />
              <span>Recognize Text (OCR)</span>
            </button>
            <span>•</span>
            <span>Controls: Draw (1 Finger) | Move Cursor (2 Fingers) | Eraser (Peace) | Select (Pinch)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
