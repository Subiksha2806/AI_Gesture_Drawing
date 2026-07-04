import { useEffect, useRef, useState } from 'react';

interface UseWebcamProps {
  width?: number;
  height?: number;
}

export function useWebcam({ width = 640, height = 480 }: UseWebcamProps = {}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function initCamera() {
      setIsLoading(true);
      setError(null);
      try {
        const constraints = {
          audio: false,
          video: {
            width: { ideal: width },
            height: { ideal: height },
            facingMode: 'user',
          },
        };

        const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
        if (active) {
          setStream(mediaStream);
          if (videoRef.current) {
            videoRef.current.srcObject = mediaStream;
          }
          setIsLoading(false);
        }
      } catch (err: any) {
        console.error("Error accessing webcam:", err);
        if (active) {
          setError(
            err.name === 'NotAllowedError'
              ? 'Webcam permission denied. Please allow camera access in your browser settings.'
              : 'Could not access webcam. Please verify it is connected and not in use by another app.'
          );
          setIsLoading(false);
        }
      }
    }

    initCamera();

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [width, height]);

  // If component re-mounts or video ref becomes available, attach the stream
  const setVideoRef = (el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && stream) {
      el.srcObject = stream;
    }
  };

  return {
    videoRef,
    setVideoRef,
    stream,
    error,
    isLoading,
  };
}
