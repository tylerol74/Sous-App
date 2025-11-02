import React from 'react';
import { GeneratedRecipes } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { ChefHatIcon } from './icons';

interface RecipePanelProps {
  recipes: GeneratedRecipes | null;
  isLoading: boolean;
  error: string | null;
  hasInventory: boolean;
}

export const RecipePanel: React.FC<RecipePanelProps> = ({ recipes, isLoading, error, hasInventory }) => {
  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-slate-600">
          <LoadingSpinner className="h-12 w-12 mb-4"/>
          <p className="text-lg font-semibold">Searching the web for recipes...</p>
          <p className="text-sm">This may take a moment.</p>
        </div>
      );
    }

    if (error) {
      return <div className="p-4 bg-red-100 text-red-700 rounded-lg">{error}</div>;
    }

    if (recipes && recipes.text) {
      return (
         <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200/80">
            <div className="whitespace-pre-wrap font-serif text-slate-700 leading-relaxed">
              {recipes.text}
            </div>
            {recipes.sources && recipes.sources.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-200">
                    <h4 className="font-semibold text-slate-800 mb-3">Sources</h4>
                    <ul className="space-y-2">
                        {recipes.sources.map((source, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-emerald-500 mr-2 mt-1">&#10148;</span>
                              <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 hover:underline">
                                  {source.title}
                              </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8 rounded-xl border-2 border-dashed border-slate-300">
        <ChefHatIcon className="h-16 w-16 text-slate-400 mb-4" />
        <h3 className="text-xl font-semibold text-slate-600">Ready for some inspiration?</h3>
        {hasInventory ? (
          <p>Click "Generate Recipes" to discover dishes you can make with your ingredients.</p>
        ) : (
          <p>Add ingredients to your pantry first, then we'll find recipes for you!</p>
        )}
      </div>
    );
  };
  
  return (
    <div className="mt-8 lg:mt-0">
       <h2 className="text-xl font-semibold mb-4 text-slate-700">Recipe Suggestions</h2>
       <div className="min-h-[400px]">
        {renderContent()}
       </div>
    </div>
  );
};