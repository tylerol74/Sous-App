import React, { useState, useEffect } from 'react';
import { GeneratedRecipes, Recipe } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { 
  ChefHatIcon, 
  SparklesIcon, 
  CheckIcon, 
  PlusIcon, 
  BookOpenIcon, 
  ClockIcon, 
  ArrowRightIcon 
} from './icons';

interface RecipePanelProps {
  recipes: GeneratedRecipes | null;
  isLoading: boolean;
  error: string | null;
  hasInventory: boolean;
  onCookRecipe: (recipe: Recipe) => void;
  onAddNeedToShopping: (needs: string[]) => void;
}

export const RecipePanel: React.FC<RecipePanelProps> = ({ 
  recipes, 
  isLoading, 
  error, 
  hasInventory,
  onCookRecipe,
  onAddNeedToShopping
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [showCookConfirm, setShowCookConfirm] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setSelectedIdx(0);
    setShowCookConfirm(false);
    setSuccessMsg(null);
  }, [recipes]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-600 bg-white border border-slate-200/80 rounded-xl p-8 min-h-[500px] shadow-sm">
        <LoadingSpinner className="h-12 w-12 mb-4 text-emerald-500 animate-spin"/>
        <p className="text-lg font-bold text-slate-700">Consulting Pantry Chef A.I...</p>
        <p className="text-sm text-slate-400 mt-1 max-w-xs text-center">
          Searching culinary records, matching expiration dates, and optimizing delicious custom meal combinations...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-3 shadow-sm min-h-[200px]">
        <div className="text-2xl mt-0.5">⚠️</div>
        <div>
          <h4 className="font-bold text-rose-800">Recipe Generation Failed</h4>
          <p className="text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!recipes || recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-slate-500 p-8 py-16 bg-white rounded-xl border-2 border-dashed border-slate-300 min-h-[450px]">
        <ChefHatIcon className="h-16 w-16 text-slate-300 mb-4 animate-bounce" />
        <h3 className="text-xl font-semibold text-slate-600 mb-1">Pantry Chef AI Ready</h3>
        {hasInventory ? (
          <p className="text-sm text-slate-400 max-w-sm">
            Click the "What should I make?" button to discover tailored recipes optimized to save expiring ingredients.
          </p>
        ) : (
          <p className="text-sm text-slate-400 max-w-sm">
            Add ingredients to your pantry first, then we'll find custom recipes matching what you have on hand!
          </p>
        )}
      </div>
    );
  }

  const currentRecipe = recipes[selectedIdx];

  // Calculate Pantry Match Score
  const haveCount = currentRecipe.ingredients.have.length;
  const needCount = currentRecipe.ingredients.need.length;
  const totalCount = haveCount + needCount;
  const matchPercentage = totalCount > 0 ? Math.round((haveCount / totalCount) * 100) : 100;

  // Color matching scheme
  let scoreBadgeColor = "bg-rose-50 border-rose-200 text-rose-700";
  if (matchPercentage >= 85) {
    scoreBadgeColor = "bg-emerald-50 border-emerald-200 text-emerald-800";
  } else if (matchPercentage >= 50) {
    scoreBadgeColor = "bg-amber-50 border-amber-200 text-amber-800";
  }

  const handleAddShoppingList = () => {
    if (currentRecipe.ingredients.need.length === 0) return;
    onAddNeedToShopping(currentRecipe.ingredients.need);
    setSuccessMsg(`Added ${currentRecipe.ingredients.need.length} ingredients to your Shopping List!`);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleCookThisClick = () => {
    setShowCookConfirm(true);
  };

  const handleConfirmCook = () => {
    onCookRecipe(currentRecipe);
    setShowCookConfirm(false);
    setSuccessMsg(`Cooked! Ingredients used have been automatically deducted from your Pantry.`);
    setTimeout(() => setSuccessMsg(null), 5000);
  };

  return (
    <div className="flex flex-col gap-6">
      
      {/* Toast Notification */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-bounce text-sm">
          <div className="bg-emerald-500 text-white rounded-full p-1 shrink-0">
            <CheckIcon className="h-4 w-4" />
          </div>
          <span>{successMsg}</span>
        </div>
      )}

      <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
        <BookOpenIcon className="h-5 w-5 text-emerald-500" />
        Chef Recommendations
      </h2>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* Left Side: Recipe Cards List Selector */}
        <div className="md:col-span-5 space-y-3">
          {recipes.map((recipe, idx) => {
            const h = recipe.ingredients.have.length;
            const n = recipe.ingredients.need.length;
            const tot = h + n;
            const score = tot > 0 ? Math.round((h / tot) * 100) : 100;
            const isSelected = idx === selectedIdx;

            let scoreTextClass = "text-rose-600";
            if (score >= 85) scoreTextClass = "text-emerald-600";
            else if (score >= 50) scoreTextClass = "text-amber-600";

            return (
              <button
                key={idx}
                onClick={() => {
                  setSelectedIdx(idx);
                  setShowCookConfirm(false);
                }}
                className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected 
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-md scale-[1.01]' 
                    : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm'
                }`}
              >
                <div className="flex justify-between items-start gap-2 w-full mb-1">
                  <h4 className="font-bold text-sm leading-tight line-clamp-1">{recipe.title}</h4>
                  {recipe.isCreative && (
                    <span className={`text-[9px] uppercase tracking-widest font-extrabold px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-0.5 ${
                      isSelected ? 'bg-white text-emerald-700' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      <SparklesIcon className="h-2.5 w-2.5" />
                      A.I.
                    </span>
                  )}
                </div>
                
                <p className={`text-xs line-clamp-2 leading-relaxed mb-3 ${
                  isSelected ? 'text-emerald-100' : 'text-slate-500'
                }`}>
                  {recipe.description}
                </p>

                <div className="flex justify-between items-center text-[11px] font-semibold">
                  <span className={isSelected ? 'text-emerald-100' : 'text-slate-400'}>
                    {recipe.instructions.length} Steps
                  </span>
                  <span className={`font-bold shrink-0 ${
                    isSelected ? 'text-white' : scoreTextClass
                  }`}>
                    {score}% Pantry Match
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side: Recipe Detail Sheet */}
        <div className="md:col-span-7 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col min-h-[500px]">
          
          {/* Recipe Meta */}
          <div className="border-b border-slate-100 pb-4 mb-4">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-2">
              <h3 className="text-xl md:text-2xl font-bold text-slate-800 font-serif leading-tight">
                {currentRecipe.title}
              </h3>
              
              <div className={`text-xs font-bold px-3 py-1 rounded-full border shrink-0 ${scoreBadgeColor}`}>
                {matchPercentage}% Pantry Match
              </div>
            </div>

            <p className="text-slate-600 text-sm leading-relaxed mb-3">
              {currentRecipe.description}
            </p>

            {/* Quick Stats bar */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-semibold text-slate-500">
              <span className="flex items-center gap-1">
                <ClockIcon className="h-3.5 w-3.5 text-slate-400" />
                {currentRecipe.instructions.length * 5} mins est.
              </span>
              <span className="h-3 w-px bg-slate-300" />
              <span>Uses {haveCount} pantry items</span>
            </div>
          </div>

          {/* Cooking confirmation view overlay */}
          {showCookConfirm ? (
            <div className="flex-grow flex flex-col justify-between bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 my-2">
              <div>
                <h4 className="font-bold text-emerald-800 flex items-center gap-1.5 text-base mb-1">
                  🍳 Confirm Kitchen Deduction
                </h4>
                <p className="text-xs text-emerald-700 leading-relaxed mb-4">
                  Awesome choice! Let's check these ingredients off your pantry. Pantry Chef will automatically deduct these quantities:
                </p>
                
                <div className="bg-white rounded-lg border border-emerald-100 divide-y divide-slate-100 max-h-[180px] overflow-y-auto">
                  {currentRecipe.ingredients.have.map((ing, i) => (
                    <div key={i} className="px-4 py-2 text-xs text-slate-600 flex items-center justify-between">
                      <span className="capitalize font-medium">{ing}</span>
                      <span className="text-[10px] text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded">Will Deduct</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 mt-5 border-t border-emerald-100/50 pt-4">
                <button
                  onClick={handleConfirmCook}
                  className="flex-grow py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm rounded-lg transition-all shadow active:scale-[0.99]"
                >
                  Yes, I'm cooking this!
                </button>
                <button
                  onClick={() => setShowCookConfirm(false)}
                  className="px-4 py-2.5 bg-white border border-slate-200 text-slate-600 font-semibold text-sm rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Go Back
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Ingredients split */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="bg-emerald-50/25 border border-emerald-500/10 rounded-xl p-4">
                  <h4 className="font-bold text-emerald-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    You Have
                  </h4>
                  <ul className="space-y-1 text-slate-600 text-xs">
                    {currentRecipe.ingredients.have.map((ing, i) => (
                      <li key={i} className="flex items-center gap-1.5 capitalize font-medium">
                        <CheckIcon className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        {ing}
                      </li>
                    ))}
                    {currentRecipe.ingredients.have.length === 0 && (
                      <li className="text-slate-400 italic">No pantry items used.</li>
                    )}
                  </ul>
                </div>

                <div className="bg-slate-50/40 border border-slate-200/50 rounded-xl p-4">
                  <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Needed Gaps
                  </h4>
                  <ul className="space-y-1 text-slate-600 text-xs">
                    {currentRecipe.ingredients.need.map((ing, i) => (
                      <li key={i} className="flex items-center gap-1.5 capitalize">
                        <PlusIcon className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {ing}
                      </li>
                    ))}
                    {currentRecipe.ingredients.need.length === 0 && (
                      <li className="text-emerald-600 font-medium flex items-center gap-1">
                        <CheckIcon className="h-3.5 w-3.5" />
                        None! Zero gaps!
                      </li>
                    )}
                  </ul>
                </div>
              </div>

              {/* Instructions steps */}
              <div className="flex-grow mb-6">
                <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2.5">
                  Instructions
                </h4>
                <ol className="space-y-3">
                  {currentRecipe.instructions.map((step, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-[10px] font-bold font-mono text-slate-500 shrink-0">
                        {i + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Source citations */}
              {currentRecipe.source && currentRecipe.source.uri && (
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Source Inspo:</span>
                  <a 
                    href={currentRecipe.source.uri} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-emerald-600 hover:underline flex items-center gap-0.5 font-medium max-w-[200px] truncate"
                  >
                    {currentRecipe.source.title || "External Recipe"}
                    <ArrowRightIcon className="h-3 w-3" />
                  </a>
                </div>
              )}

              {/* Footer action bar */}
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 shrink-0">
                <button
                  onClick={handleCookThisClick}
                  className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
                >
                  🍳 Cook This Dish
                </button>
                <button
                  onClick={handleAddShoppingList}
                  disabled={needCount === 0}
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <PlusIcon className="h-3.5 w-3.5" />
                  Add Gaps to List
                </button>
              </div>
            </>
          )}

        </div>

      </div>

    </div>
  );
};
