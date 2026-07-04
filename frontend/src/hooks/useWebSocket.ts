import { useEffect, useRef, useState, useCallback } from 'react';
import type { RefObject } from 'react';

interface UseWebSocketProps {
  url?: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  onFrameResponse: (data: any) => void;
  onVoiceCommand: (data: any) => void;
  onShapeCorrected: (data: any) => void;
  onOcrResponse: (data: any) => void;
  onSaveResponse: (data: any) => void;
}

export function useWebSocket({
  url = 'ws://localhost:8000/ws',
  videoRef,
  onFrameResponse,
  onVoiceCommand,
  onShapeCorrected,
  onOcrResponse,
  onSaveResponse
}: UseWebSocketProps) {
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const frameIntervalRef = useRef<number | null>(null);
  
  // Offscreen canvas for frame capture and JPEG compression
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isProcessingFrameRef = useRef<boolean>(false);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    setStatus('connecting');
    console.log(`Connecting to WebSocket at ${url}...`);
    
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected successfully');
      setStatus('connected');
      isProcessingFrameRef.current = false;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          case 'frame_response':
            isProcessingFrameRef.current = false;
            onFrameResponse(data);
            break;
          case 'voice_command':
            onVoiceCommand(data);
            break;
          case 'shape_corrected':
            onShapeCorrected(data);
            break;
          case 'ocr_response':
            onOcrResponse(data);
            break;
          case 'save_response':
            onSaveResponse(data);
            break;
          case 'pong':
            // Heartbeat
            break;
          default:
            console.log('Unhandled WebSocket message:', data);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket connection error:', err);
      setStatus('disconnected');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
      setStatus('disconnected');
      // Trigger reconnection after 3 seconds
      if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = window.setTimeout(() => {
        connect();
      }, 3000);
    };
  }, [url, onFrameResponse, onVoiceCommand, onShapeCorrected, onOcrResponse, onSaveResponse]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) window.clearTimeout(reconnectTimeoutRef.current);
    if (frameIntervalRef.current) window.clearInterval(frameIntervalRef.current);
    
    if (wsRef.current) {
      wsRef.current.onclose = null; // Remove listener to avoid reconnect loop
      wsRef.current.close();
      wsRef.current = null;
    }
    setStatus('disconnected');
  }, []);

  // Frame sender loop
  useEffect(() => {
    if (status !== 'connected') {
      if (frameIntervalRef.current) {
        window.clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
      return;
    }

    // Initialize offscreen canvas
    if (!offscreenCanvasRef.current) {
      offscreenCanvasRef.current = document.createElement('canvas');
      offscreenCanvasRef.current.width = 640;
      offscreenCanvasRef.current.height = 480;
    }

    const canvas = offscreenCanvasRef.current;
    const ctx = canvas.getContext('2d');

    // Run interval to grab webcam frames and stream them
    frameIntervalRef.current = window.setInterval(() => {
      // Flow control: skip frame if we are already processing one to prevent queue congestion
      if (isProcessingFrameRef.current) return;
      
      const videoElement = videoRef.current;
      if (!videoElement || !ctx || videoElement.readyState < 2) return; // 2 = HAVE_CURRENT_DATA

      // Draw mirrored video frame to offscreen canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Convert to blob and send
      canvas.toBlob((blob) => {
        if (blob && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          isProcessingFrameRef.current = true;
          wsRef.current.send(blob);
        }
      }, 'image/jpeg', 0.65); // JPEG compression at 0.65 quality (excellent trade-off)
    }, 33); // Attempt 30 FPS stream

    return () => {
      if (frameIntervalRef.current) {
        window.clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [status, videoRef]);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  // Send request for settings update
  const sendSettings = useCallback((emaAlpha: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'settings',
        ema_alpha: emaAlpha
      }));
    }
  }, []);

  // Send request for shape correction
  const sendDetectShape = useCallback((points: Array<{ x: number; y: number }>, width: number, height: number) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'detect_shape',
        points,
        width,
        height
      }));
    }
  }, []);

  // Send image data for OCR recognition
  const sendOcrRequest = useCallback((imageB64: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'ocr_request',
        image: imageB64
      }));
    }
  }, []);

  // Send voice transcript to be parsed
  const sendVoiceTranscript = useCallback((transcript: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'voice_transcript',
        transcript
      }));
    }
  }, []);

  // Send image to save on disk
  const sendSaveRequest = useCallback((imageB64: string, format: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'save_request',
        image: imageB64,
        format
      }));
    }
  }, []);

  return {
    status,
    sendSettings,
    sendDetectShape,
    sendOcrRequest,
    sendVoiceTranscript,
    sendSaveRequest
  };
}
