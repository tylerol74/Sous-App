import React, { useState, useRef, useCallback, useEffect } from 'react';
import { CameraIcon, CheckIcon, ReloadIcon, UploadIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { resizeAndCompressImageDataUrl } from '../utils';

interface ImageCaptureModalProps {
  onClose: () => void;
  onImageCapture: (data: { imageData: string; mimeType: string }) => void;
}

type Phase = 'select' | 'camera_initializing' | 'camera_active' | 'compressing' | 'preview' | 'error';

const isCameraSupported = typeof window !== 'undefined' && navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices;
const isFileSupported = typeof window !== 'undefined' && 'FileReader' in window;

export const ImageCaptureModal: React.FC<ImageCaptureModalProps> = ({ onClose, onImageCapture }) => {
  const [phase, setPhase] = useState<Phase>('select');
  const [error, setError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setPhase('camera_initializing');
    setError(null);

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('Could not access the camera. Please check permissions.');
      setPhase('error');
    }
  }, [stopCamera]);

  const takePhoto = useCallback(async () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setPhase('compressing');
        stopCamera();
        try {
          const compressed = await resizeAndCompressImageDataUrl(dataUrl);
          setCapturedImage(compressed);
          setPhase('preview');
        } catch (err) {
          setError('Failed to optimize captured photo.');
          setPhase('error');
        }
      }
    }
  }, [stopCamera]);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPhase('compressing');
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const compressed = await resizeAndCompressImageDataUrl(reader.result as string);
        setCapturedImage(compressed);
        setPhase('preview');
      } catch (err) {
        setError('Failed to optimize selected file.');
        setPhase('error');
      }
    };
    reader.onerror = () => {
      setError('Failed to read the selected file.');
      setPhase('error');
    };
  }, []);

  const handleSubmit = () => {
    if (capturedImage) {
      const parts = capturedImage.split(',');
      const meta = parts[0];
      const data = parts[1];
      const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/jpeg';
      onImageCapture({ imageData: data, mimeType });
    }
  };
  
  const reset = () => {
      stopCamera();
      setCapturedImage(null);
      setError(null);
      setPhase('select');
  };

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);
  
  const renderContent = () => {
      switch (phase) {
        case 'select':
            return (
                <div className="p-6 flex flex-col sm:flex-row gap-4 justify-center items-center h-full">
                    <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" ref={fileInputRef} />
                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!isFileSupported}
                        title={!isFileSupported ? "File upload is not supported" : "Upload an image file"}
                        className="w-full sm:w-auto flex-1 flex flex-col items-center justify-center p-6 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <UploadIcon className="h-10 w-10 mb-2"/>
                        Upload Image
                    </button>
                    <button 
                        onClick={startCamera}
                        disabled={!isCameraSupported}
                        title={!isCameraSupported ? "Camera is not supported" : "Use your device's camera"}
                        className="w-full sm:w-auto flex-1 flex flex-col items-center justify-center p-6 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                       <CameraIcon className="h-10 w-10 mb-2"/>
                       Take Photo
                    </button>
                </div>
            )
        case 'camera_initializing':
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 bg-slate-200/80">
                    <LoadingSpinner className="h-10 w-10 mb-2"/>
                    <p>Starting camera...</p>
                </div>
            )
        case 'camera_active':
            return (
                <div className="absolute inset-0">
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
                        <button onClick={takePhoto} className="h-16 w-16 bg-white rounded-full border-4 border-slate-300 hover:border-emerald-500 transition-colors flex items-center justify-center" aria-label="Take photo">
                            <div className="h-12 w-12 bg-slate-200 rounded-full"></div>
                        </button>
                    </div>
                </div>
            )
        case 'compressing':
            return (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 bg-slate-100">
                    <LoadingSpinner className="h-10 w-10 mb-2 text-emerald-500 animate-spin"/>
                    <p className="font-semibold text-slate-700">Optimizing Photo...</p>
                    <p className="text-xs text-slate-400 mt-1 px-4 text-center">Compressing & scaling image for lightning-fast AI analysis</p>
                </div>
            )
        case 'preview':
            return (
                <div className="relative w-full h-full flex items-center justify-center">
                    {capturedImage && <img src={capturedImage} alt="Captured preview" className="block max-w-full max-h-[60vh] object-contain" />}
                     <div className="absolute bottom-4 left-4 right-4 flex gap-4">
                        <button onClick={reset} className="flex-1 flex items-center justify-center px-4 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                            <ReloadIcon className="h-5 w-5 mr-2" />
                            Try Again
                        </button>
                        <button onClick={handleSubmit} className="flex-1 flex items-center justify-center px-4 py-3 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors">
                            <CheckIcon className="h-5 w-5 mr-2" />
                            Use Photo
                        </button>
                    </div>
                </div>
            );
        case 'error':
            return (
                <div className="p-4 flex flex-col items-center justify-center h-full text-center bg-red-50 text-red-800">
                    <p className="font-semibold mb-4">{error}</p>
                    <button onClick={reset} className="w-full max-w-xs flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors">
                      <ReloadIcon className="h-5 w-5 mr-2" />
                      Try Again
                    </button>
                </div>
            )
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg relative">
        <h3 className="text-lg font-semibold text-center py-3 border-b border-slate-200">Scan Image</h3>
        <div className={`relative w-full ${phase !== 'preview' ? 'aspect-video' : ''} bg-slate-200 overflow-hidden`}>
          {(phase === 'camera_initializing' || phase === 'camera_active') && (
            <video 
              ref={videoRef} 
              className="w-full h-full object-cover" 
              playsInline 
              autoPlay 
              onCanPlay={() => setPhase('camera_active')}
            />
          )}
          {renderContent()}
        </div>
        <div className="p-3 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};