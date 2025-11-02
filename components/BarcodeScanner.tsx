import React, { useEffect, useRef, useState, useCallback } from 'react';
import { LoadingSpinner } from './LoadingSpinner';
import { fetchProductByBarcode } from '../services/productService';
import { ReloadIcon } from './icons';

interface BarcodeScannerProps {
  onBarcodeScanned: (product: { name: string | null }) => void;
  onClose: () => void;
}

type ScanPhase = 'initializing' | 'scanning' | 'fetching' | 'error';

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onBarcodeScanned, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const animationFrameId = useRef<number>();

  const [phase, setPhase] = useState<ScanPhase>('initializing');
  const [error, setError] = useState<string | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startScan = useCallback(async () => {
    setPhase('initializing');
    setError(null);

    if (!('BarcodeDetector' in window)) {
      setError('Barcode detection is not supported by your browser.');
      setPhase('error');
      return;
    }
    
    if (!detectorRef.current) {
      detectorRef.current = new (window as any).BarcodeDetector({ formats: ['ean_13', 'upc_a', 'ean_8'] });
    }

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
  }, []);

  const scanFrame = useCallback(async () => {
    if (phase !== 'scanning' || !videoRef.current || videoRef.current.readyState < 2 || !detectorRef.current) {
      return;
    }
    
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      if (barcodes.length > 0) {
        setPhase('fetching');
        const barcodeValue = barcodes[0].rawValue;
        const result = await fetchProductByBarcode(barcodeValue);
        onBarcodeScanned({ name: result ? result.name : null });
      } else {
        animationFrameId.current = requestAnimationFrame(scanFrame);
      }
    } catch (err) {
      console.warn("API or detection error:", err);
      // If fetching or detection fails, proceed as if product not found
      onBarcodeScanned({ name: null });
    }
  }, [phase, onBarcodeScanned]);

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
    if (phase === 'scanning') {
      animationFrameId.current = requestAnimationFrame(scanFrame);
    } else {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    }
  }, [phase, scanFrame]);

  const renderContent = () => {
    switch (phase) {
      case 'initializing':
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600">
            <LoadingSpinner className="h-10 w-10 mb-2"/>
            <p>Starting camera...</p>
          </div>
        );
      case 'scanning':
        return (
          <>
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-11/12 h-1/2 border-4 border-white border-opacity-50 rounded-lg" />
                <div className="absolute top-1/2 left-0 w-full h-1 bg-red-500 opacity-75 animate-scan-line" />
            </div>
            <p className="absolute bottom-4 text-white text-center w-full text-shadow">Position barcode inside the frame</p>
          </>
        );
      case 'fetching':
         return (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 bg-white bg-opacity-80">
            <LoadingSpinner className="h-10 w-10 mb-2"/>
            <p>Looking up barcode...</p>
          </div>
        );
      case 'error':
        return (
           <div className="absolute inset-0 p-4 flex flex-col items-center justify-center h-full text-center bg-red-50 text-red-800">
            <p className="font-semibold mb-4">{error}</p>
            <button onClick={startScan} className="w-full max-w-xs flex items-center justify-center px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors">
              <ReloadIcon className="h-5 w-5 mr-2" />
              Try Again
            </button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg relative">
        <h3 className="text-lg font-semibold text-center py-3 border-b border-slate-200">Scan Barcode</h3>
        <div className="relative w-full aspect-video bg-slate-200 overflow-hidden">
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover" 
            playsInline 
            onCanPlay={() => setPhase('scanning')}
          />
          {renderContent()}
        </div>
        <style>{`
          .text-shadow { text-shadow: 0 1px 3px rgba(0,0,0,0.5); }
          @keyframes scan-line-anim {
            0% { transform: translateY(-100px); }
            100% { transform: translateY(100px); }
          }
          .animate-scan-line {
            animation: scan-line-anim 2s ease-in-out infinite alternate;
          }
        `}</style>
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