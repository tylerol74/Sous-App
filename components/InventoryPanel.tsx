import React, { useState, useCallback } from 'react';
import { identifyItemsFromImage } from '../services/geminiService';
import { CameraIcon, SparklesIcon, ReceiptIcon, BarcodeIcon } from './icons';
import { LoadingSpinner } from './LoadingSpinner';
import { InventoryItem } from '../types';
import { BarcodeScanner } from './BarcodeScanner';
import { ImageCaptureModal } from './ImageCaptureModal';
import { ConfirmationPanel } from './ConfirmationPanel';
import { InventoryList } from './InventoryList';

interface InventoryPanelProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  onGenerateRecipes: () => void;
  isGenerating: boolean;
  timeConstraint: string;
  setTimeConstraint: React.Dispatch<React.SetStateAction<string>>;
  cuisineFilter: string;
  setCuisineFilter: React.Dispatch<React.SetStateAction<string>>;
  dietFilter: string;
  setDietFilter: React.Dispatch<React.SetStateAction<string>>;
  mealTypeFilter: string;
  setMealTypeFilter: React.Dispatch<React.SetStateAction<string>>;
}

const isBarcodeSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window && navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices;
const isCameraSupported = typeof window !== 'undefined' && navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices;
const isFileUploadSupported = typeof window !== 'undefined' && 'FileReader' in window;
const selectClasses = "w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition bg-white";


export const InventoryPanel: React.FC<InventoryPanelProps> = ({ 
  inventory, setInventory, onGenerateRecipes, isGenerating, 
  timeConstraint, setTimeConstraint,
  cuisineFilter, setCuisineFilter,
  dietFilter, setDietFilter,
  mealTypeFilter, setMealTypeFilter
}) => {
  const [isIdentifying, setIsIdentifying] = useState(false);
  const [isScanningReceipt, setIsScanningReceipt] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [captureContext, setCaptureContext] = useState<'pantry' | 'receipt' | 'barcode'>('pantry');
  const [itemsToConfirm, setItemsToConfirm] = useState<{name: string, quantity: string}[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleConfirmationSubmit = useCallback((confirmedItems: Omit<InventoryItem, 'id'>[]) => {
    setInventory(prev => {
        const existingNames = new Set(prev.map(i => i.name.toLowerCase()));
        const newItems = confirmedItems
            .filter(item => item.name.trim() && !existingNames.has(item.name.toLowerCase()))
            .map(item => ({
                id: `${Date.now()}-${item.name}`,
                name: item.name.toLowerCase(),
                quantity: item.quantity,
                expirationDate: item.expirationDate,
            }));
        return [...prev, ...newItems];
    });
    setItemsToConfirm(null);
  }, [setInventory]);
  
  const handleImageCapture = useCallback(async ({ imageData, mimeType }: { imageData: string; mimeType: string; }) => {
    setIsCaptureModalOpen(false);
    const stateSetter = captureContext === 'pantry' ? setIsIdentifying : setIsScanningReceipt;
    stateSetter(true);
    setError(null);
    try {
      const items = await identifyItemsFromImage(imageData, mimeType, captureContext);
      setItemsToConfirm(items);
    } catch (err) {
      setError(err instanceof Error ? err.message : `An unknown error occurred while scanning ${captureContext}.`);
    } finally {
      stateSetter(false);
    }
  }, [captureContext]);

  const handleBarcodeScanned = useCallback(({ name }: { name: string | null }) => {
    setShowBarcodeScanner(false);
    setCaptureContext('barcode');
    setItemsToConfirm([{ name: name || '', quantity: '1' }]);
  }, []);

  const isBusy = isGenerating || isIdentifying || isScanningReceipt;
  const canScanImage = isCameraSupported || isFileUploadSupported;

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200/80 flex flex-col h-full">
      {showBarcodeScanner && (
        <BarcodeScanner 
          onBarcodeScanned={handleBarcodeScanned}
          onClose={() => setShowBarcodeScanner(false)}
        />
      )}
      {isCaptureModalOpen && (
        <ImageCaptureModal
          onClose={() => setIsCaptureModalOpen(false)}
          onImageCapture={handleImageCapture}
        />
      )}
      {itemsToConfirm && (
        <ConfirmationPanel
            initialItems={itemsToConfirm}
            onConfirm={handleConfirmationSubmit}
            onClose={() => setItemsToConfirm(null)}
            context={captureContext}
        />
      )}

      <h2 className="text-xl font-semibold text-slate-700 mb-4">Manage Pantry</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => {
              setCaptureContext('pantry');
              setIsCaptureModalOpen(true);
            }}
            disabled={isBusy}
            title={!canScanImage ? "Image scanning is not supported by your browser." : "Scan your pantry or fridge"}
            className="w-full flex items-center justify-center px-4 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isIdentifying ? (
              <>
                <LoadingSpinner className="h-5 w-5 mr-2"/>
                Scanning...
              </>
            ) : (
              <>
                <CameraIcon className="h-5 w-5 mr-2" />
                Scan Pantry
              </>
            )}
          </button>
          <button
            onClick={() => {
              setCaptureContext('receipt');
              setIsCaptureModalOpen(true);
            }}
            disabled={isBusy}
            title={!canScanImage ? "Image scanning is not supported by your browser." : "Scan a grocery receipt"}
            className="w-full flex items-center justify-center px-4 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanningReceipt ? (
              <>
                <LoadingSpinner className="h-5 w-5 mr-2"/>
                Scanning...
              </>
            ) : (
              <>
                <ReceiptIcon className="h-5 w-5 mr-2" />
                Scan Receipt
              </>
            )}
          </button>
           <button
            onClick={() => setShowBarcodeScanner(true)}
            disabled={isBusy || !isBarcodeSupported}
            title={!isBarcodeSupported ? "Barcode scanning is not supported by your browser." : "Scan a product barcode"}
            className="w-full sm:col-span-2 lg:col-span-1 flex items-center justify-center px-4 py-3 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <BarcodeIcon className="h-5 w-5 mr-2" />
            Scan Barcode
          </button>
      </div>

      {error && <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{error}</div>}

      <InventoryList inventory={inventory} setInventory={setInventory} />

      <div className="mt-6 pt-6 border-t border-slate-200">
        <div className="space-y-4 mb-4">
          <h3 className="text-base font-semibold text-slate-700">Recipe Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cuisineFilter" className="block text-sm font-medium text-slate-700 mb-1">Cuisine</label>
              <select id="cuisineFilter" value={cuisineFilter} onChange={(e) => setCuisineFilter(e.target.value)} className={selectClasses}>
                  <option value="">Any</option>
                  <option value="Italian">Italian</option>
                  <option value="Mexican">Mexican</option>
                  <option value="Indian">Indian</option>
                  <option value="Chinese">Chinese</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Thai">Thai</option>
                  <option value="American">American</option>
                  <option value="Mediterranean">Mediterranean</option>
              </select>
            </div>
            <div>
              <label htmlFor="dietFilter" className="block text-sm font-medium text-slate-700 mb-1">Dietary</label>
              <select id="dietFilter" value={dietFilter} onChange={(e) => setDietFilter(e.target.value)} className={selectClasses}>
                  <option value="">Any</option>
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="Gluten-Free">Gluten-Free</option>
                  <option value="Keto">Keto</option>
                  <option value="Paleo">Paleo</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="mealTypeFilter" className="block text-sm font-medium text-slate-700 mb-1">Meal Type</label>
               <select id="mealTypeFilter" value={mealTypeFilter} onChange={(e) => setMealTypeFilter(e.target.value)} className={selectClasses}>
                  <option value="">Any</option>
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snack">Snack</option>
                  <option value="Dessert">Dessert</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="timeConstraint" className="block text-sm font-medium text-slate-700 mb-1">Max Cooking Time (minutes)</label>
          <input
            type="number"
            id="timeConstraint"
            value={timeConstraint}
            onChange={(e) => setTimeConstraint(e.target.value)}
            placeholder="e.g., 30"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            min="0"
          />
        </div>
        <button
          onClick={onGenerateRecipes}
          disabled={inventory.length === 0 || isBusy}
          className="w-full mt-4 flex items-center justify-center text-lg px-4 py-3 bg-emerald-500 text-white font-bold rounded-lg hover:bg-emerald-600 transition-all transform hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100"
        >
          {isGenerating ? (
            <>
              <LoadingSpinner className="h-6 w-6 mr-3" />
              Generating...
            </>
          ) : (
            <>
              <SparklesIcon className="h-6 w-6 mr-2" />
              Generate Recipes
            </>
          )}
        </button>
      </div>
    </div>
  );
};