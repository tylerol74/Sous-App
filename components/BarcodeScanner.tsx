import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { identifyBarcodeProduct } from '../services/geminiService';
import { ReloadIcon, CameraIcon } from './icons';

interface BarcodeScannerProps {
  onBarcodeScanned: (product: { name: string | null }) => void;
  onClose: () => void;
}

type ScanPhase = 'initializing' | 'scanning' | 'fetching' | 'error';

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onBarcodeScanned, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const animationFrameId = useRef<number | null>(null);

  const [phase, setPhase] = useState<ScanPhase>('initializing');
  const [error, setError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [isBarcodeDetectorSupported, setIsBarcodeDetectorSupported] = useState(false);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startScan = useCallback(async () => {
    setPhase('initializing');
    setError(null);

    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    setIsBarcodeDetectorSupported(hasBarcodeDetector);
    
    if (hasBarcodeDetector && !detectorRef.current) {
      try {
        detectorRef.current = new (window as any).BarcodeDetector({ 
          formats: ['ean_13', 'upc_a', 'ean_8', 'code_128'] 
        });
      } catch (e) {
        console.warn("BarcodeDetector initialization failed, using Gemini photo mode:", e);
      }
    }

    try {
      streamRef.current = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });

      if (videoRef.current) {
        videoRef.current.srcObject = streamRef.current;
        await videoRef.current.play();
        setPhase('scanning');
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('Could not access the camera. Check camera permissions or enter the product name manually below.');
      setPhase('error');
    }
  }, []);

  // Frame scanner for native BarcodeDetector
  const scanFrame = useCallback(async () => {
    if (phase !== 'scanning' || !videoRef.current || videoRef.current.readyState < 2 || !detectorRef.current) {
      return;
    }
    
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        setPhase('fetching');
        const barcodeValue = barcodes[0].rawValue;
        // Search barcode using backend open food facts / gemini route
        const result = await identifyBarcodeProduct({ barcode: barcodeValue });
        onBarcodeScanned({ name: result.name });
      } else {
        animationFrameId.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      console.warn("Native detection error, continuing camera loop:", err);
      animationFrameId.current = requestAnimationFrame(scanFrame);
    }
  }, [phase, onBarcodeScanned]);

  // Captures current frame from video stream and sends to Gemini backend to scan
  const captureAndScanWithGemini = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setPhase('fetching');
    setError(null);

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Set canvas to match current video aspect ratio
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        const base64Data = dataUrl.split(',')[1];
        
        const result = await identifyBarcodeProduct({ 
          imageData: base64Data, 
          mimeType: 'image/jpeg' 
        });

        if (result && result.name) {
          onBarcodeScanned({ name: result.name });
        } else {
          setError("Pantry Chef AI could not clearly identify a food product or barcode from this angle. Please adjust lighting, hold steady, or search manually.");
          setPhase('scanning');
        }
      }
    } catch (err) {
      console.error("Gemini snapshot scan error:", err);
      setError("Failed to scan snapshot. Try checking your connection or search manually.");
      setPhase('scanning');
    }
  };

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    setPhase('fetching');
    onBarcodeScanned({ name: manualInput.trim() });
  };

  useEffect(() => {
    startScan();
    return () => {
      stopCamera();
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [startScan, stopCamera]);

  useEffect(() => {
    if (phase === 'scanning' && isBarcodeDetectorSupported && detectorRef.current) {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, [phase, scanFrame, isBarcodeDetectorSupported]);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Scan Barcode or Product</h3>
            <p className="text-xs text-slate-500">
              {isBarcodeDetectorSupported 
                ? "Automatic real-time barcode detector active" 
                : "A.I. Smart-Scanner Mode active"}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors text-2xl font-semibold leading-none p-1"
          >
            &times;
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative w-full aspect-video bg-slate-900 overflow-hidden flex items-center justify-center">
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover" 
            playsInline 
            onCanPlay={() => {
              if (phase === 'initializing') setPhase('scanning');
            }}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Guidelines Overlay */}
          {phase === 'scanning' && (
            <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none">
              <div className="flex justify-between w-full">
                <div className="w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl" />
                <div className="w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr" />
              </div>
              
              <div className="self-center flex flex-col items-center">
                <div className="w-64 h-28 border-2 border-dashed border-emerald-400/80 rounded-lg flex items-center justify-center bg-emerald-500/10">
                  <span className="text-[10px] tracking-widest text-emerald-300 font-mono uppercase bg-slate-950/60 px-2 py-0.5 rounded">
                    Align Barcode or Product Label
                  </span>
                </div>
              </div>

              <div className="flex justify-between w-full">
                <div className="w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl" />
                <div className="w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br" />
              </div>
            </div>
          )}

          {/* Phase Overlays */}
          {phase === 'initializing' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-950/80">
              <LoadingSpinner className="h-10 w-10 mb-3 text-emerald-400"/>
              <p className="text-sm font-medium">Powering on lens...</p>
            </div>
          )}

          {phase === 'fetching' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-950/90">
              <LoadingSpinner className="h-12 w-12 mb-3 text-emerald-400 animate-pulse"/>
              <p className="text-sm font-semibold tracking-wide">Pantry Chef AI Analyzing Label...</p>
              <p className="text-xs text-slate-400 mt-1">Reading product name & details</p>
            </div>
          )}

          {phase === 'error' && (
            <div className="absolute inset-0 p-6 flex flex-col items-center justify-center text-center bg-rose-50 text-rose-800">
              <p className="font-semibold text-sm mb-4 leading-relaxed">{error}</p>
              <button 
                onClick={startScan} 
                className="flex items-center justify-center px-4 py-2 bg-rose-600 text-white font-semibold rounded-lg hover:bg-rose-700 transition-colors shadow"
              >
                <ReloadIcon className="h-4 w-4 mr-2" />
                Retry Camera
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="p-6 space-y-5 bg-slate-50/50 flex-shrink-0">
          {phase === 'scanning' && (
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={captureAndScanWithGemini}
                className="w-full flex items-center justify-center py-3 bg-emerald-500 text-white text-base font-bold rounded-xl shadow-md hover:bg-emerald-600 active:scale-[0.98] transition-all"
              >
                <CameraIcon className="h-5 w-5 mr-2" />
                Snap Photo to Scan Product
              </button>
              <p className="text-[11px] text-slate-500 text-center mt-2">
                Click to let Chef AI inspect the image and identify the exact grocery product!
              </p>
            </div>
          )}

          {/* Error notice in scanning phase */}
          {error && phase === 'scanning' && (
            <div className="p-3 bg-amber-50 text-amber-800 rounded-lg text-xs border border-amber-200">
              {error}
            </div>
          )}

          {/* Manual input search */}
          <form onSubmit={handleManualSearch} className="border-t border-slate-200/60 pt-4">
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-2">
              Or Enter Food Name / Barcode Manually
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="e.g., Organic Whole Milk, Heinz Ketchup"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                className="flex-grow px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-shadow bg-white text-sm"
              />
              <button
                type="submit"
                disabled={!manualInput.trim() || phase === 'fetching'}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-800 disabled:bg-slate-300 text-white font-semibold text-sm rounded-xl transition-colors shrink-0"
              >
                Lookup
              </button>
            </div>
          </form>

          {/* Close button */}
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
