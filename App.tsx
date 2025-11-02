import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { InventoryPanel } from './components/InventoryPanel';
import { RecipePanel } from './components/RecipePanel';
import { GeneratedRecipes, InventoryItem } from './types';
import { getRecipes } from './services/geminiService';

const App: React.FC = () => {
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    try {
      const savedInventory = localStorage.getItem('pantryChefInventory');
      if (savedInventory) {
        return JSON.parse(savedInventory);
      }
    } catch (error) {
      console.error("Failed to parse inventory from localStorage", error);
    }
    // Return default inventory if nothing is saved or parsing fails
    return [
      { id: '1', name: 'eggs', quantity: '12', expirationDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '2', name: 'milk', quantity: '1 liter', expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
      { id: '3', name: 'flour', quantity: '500g', expirationDate: '' },
      { id: '4', name: 'sugar', quantity: '1kg', expirationDate: '' },
    ];
  });
  const [recipes, setRecipes] = useState<GeneratedRecipes | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeConstraint, setTimeConstraint] = useState<string>(''); // in minutes
  const [cuisineFilter, setCuisineFilter] = useState('');
  const [dietFilter, setDietFilter] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('');
  const [isInventoryVisible, setIsInventoryVisible] = useState(true);

  useEffect(() => {
    try {
      localStorage.setItem('pantryChefInventory', JSON.stringify(inventory));
    } catch (error) {
      console.error("Failed to save inventory to localStorage", error);
    }
  }, [inventory]);

  const handleGenerateRecipes = useCallback(async () => {
    if (inventory.length === 0) {
      setError("Please add some ingredients to your pantry first.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setRecipes(null);
    try {
      const ingredientNames = inventory.map(item => item.name);
      const generatedRecipes = await getRecipes(ingredientNames, timeConstraint, cuisineFilter, dietFilter, mealTypeFilter);
      setRecipes(generatedRecipes);
    } catch (err) {
      setError(err instanceof Error ? `Failed to generate recipes: ${err.message}` : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  }, [inventory, timeConstraint, cuisineFilter, dietFilter, mealTypeFilter]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header 
        isInventoryVisible={isInventoryVisible}
        onToggleInventory={() => setIsInventoryVisible(prev => !prev)}
      />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-12">
          {isInventoryVisible && (
            <div className="lg:col-span-6 xl:col-span-5">
              <InventoryPanel 
                inventory={inventory} 
                setInventory={setInventory} 
                onGenerateRecipes={handleGenerateRecipes}
                isGenerating={isGenerating}
                timeConstraint={timeConstraint}
                setTimeConstraint={setTimeConstraint}
                cuisineFilter={cuisineFilter}
                setCuisineFilter={setCuisineFilter}
                dietFilter={dietFilter}
                setDietFilter={setDietFilter}
                mealTypeFilter={mealTypeFilter}
                setMealTypeFilter={setMealTypeFilter}
              />
            </div>
          )}
          <div className={isInventoryVisible ? "lg:col-span-6 xl:col-span-7" : "lg:col-span-12"}>
            <RecipePanel 
              recipes={recipes} 
              isLoading={isGenerating} 
              error={error} 
              hasInventory={inventory.length > 0}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;