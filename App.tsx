import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { InventoryPanel } from './components/InventoryPanel';
import { RecipePanel } from './components/RecipePanel';
import { ShoppingListPanel } from './components/ShoppingListPanel';
import { AuthPage } from './components/AuthPage';
import { GeneratedRecipes, InventoryItem, ShoppingItem, User, Recipe } from './types';
import { getRecipes } from './services/geminiService';
import * as authService from './services/authService';
import { deductQuantity, combineQuantities } from './utils';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => authService.getCurrentUser());
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [recipes, setRecipes] = useState<GeneratedRecipes | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [timeConstraint, setTimeConstraint] = useState<string>(''); // in minutes
  const [cuisineFilter, setCuisineFilter] = useState('');
  const [dietFilter, setDietFilter] = useState('');
  const [mealTypeFilter, setMealTypeFilter] = useState('');
  const [isInventoryVisible, setIsInventoryVisible] = useState(true);
  const [activeTab, setActiveTab] = useState<'pantry' | 'shopping'>('pantry');

  // Load user data from Server (with Local Storage fallback) on login
  useEffect(() => {
    const loadUserData = async () => {
      if (currentUser) {
        try {
          // 1. Try to load pantry from cloud sync
          const cloudPantry = await authService.syncPantryFromServer(currentUser.email);
          if (cloudPantry) {
            setInventory(cloudPantry);
          } else {
            // Local fallback
            const pantryKey = `pantryChefInventory_${currentUser.email}`;
            const savedInventory = localStorage.getItem(pantryKey);
            if (savedInventory) {
              setInventory(JSON.parse(savedInventory));
            } else {
              // Set default pantry items for a pristine first-user feel
              setInventory([
                { id: '1', name: 'eggs', quantity: '12 count', expirationDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
                { id: '2', name: 'milk', quantity: '1 liter', expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
                { id: '3', name: 'spinach', quantity: '200g', expirationDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }, // Expiring soon!
                { id: '4', name: 'flour', quantity: '500g', expirationDate: '' },
                { id: '5', name: 'chicken breast', quantity: '400g', expirationDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
              ]);
            }
          }

          // 2. Try to load shopping list from cloud sync
          const cloudShopping = await authService.syncShoppingFromServer(currentUser.email);
          if (cloudShopping) {
            setShoppingList(cloudShopping);
          } else {
            // Local fallback
            const shoppingKey = `pantryChefShopping_${currentUser.email}`;
            const savedShopping = localStorage.getItem(shoppingKey);
            if (savedShopping) {
              setShoppingList(JSON.parse(savedShopping));
            } else {
              setShoppingList([]);
            }
          }
        } catch (error) {
          console.error("Failed to parse user session data", error);
        }
      } else {
        setInventory([]);
        setShoppingList([]);
      }
    };
    loadUserData();
  }, [currentUser]);

  // Synchronize / Backup Pantry changes to Server + LocalStorage
  useEffect(() => {
    if (currentUser) {
      try {
        const pantryKey = `pantryChefInventory_${currentUser.email}`;
        localStorage.setItem(pantryKey, JSON.stringify(inventory));
        authService.syncPantryToServer(currentUser.email, inventory);
      } catch (error) {
        console.error("Failed to save inventory to local/cloud sync", error);
      }
    }
  }, [inventory, currentUser]);

  // Synchronize / Backup Shopping List changes to Server + LocalStorage
  useEffect(() => {
    if (currentUser) {
      try {
        const shoppingKey = `pantryChefShopping_${currentUser.email}`;
        localStorage.setItem(shoppingKey, JSON.stringify(shoppingList));
        authService.syncShoppingToServer(currentUser.email, shoppingList);
      } catch (error) {
        console.error("Failed to save shopping list to local/cloud sync", error);
      }
    }
  }, [shoppingList, currentUser]);

  const handleGenerateRecipes = useCallback(async () => {
    if (inventory.length === 0) {
      setError("Please add some ingredients to your pantry first.");
      return;
    }
    setIsGenerating(true);
    setError(null);
    setRecipes(null);
    try {
      // Send the entire inventory list with quantities and expiration dates to make intelligent suggestions!
      const generatedRecipes = await getRecipes(inventory, timeConstraint, cuisineFilter, dietFilter, mealTypeFilter);
      setRecipes(generatedRecipes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  }, [inventory, timeConstraint, cuisineFilter, dietFilter, mealTypeFilter]);

  // Cook Recipe: Deduct ingredients from pantry
  const handleCookRecipe = useCallback((recipe: Recipe) => {
    setInventory(prev => {
      let updated = [...prev];
      recipe.ingredients.have.forEach(recipeIng => {
        const recipeIngLower = recipeIng.toLowerCase();
        
        // Find matching item in pantry. Match where pantry item name is found in recipe ing name or vice versa
        const matchIdx = updated.findIndex(item => 
          recipeIngLower.includes(item.name.toLowerCase()) || 
          item.name.toLowerCase().includes(recipeIngLower)
        );

        if (matchIdx > -1) {
          const pantryItem = updated[matchIdx];
          
          // Match digits and decimal parts of recipe ingredient
          const qtyMatch = recipeIng.match(/^([\d.,]+)?\s*(.*)$/);
          const recipeQty = qtyMatch ? (qtyMatch[1] || '1') : '1';

          const { newQty, isDepleted } = deductQuantity(pantryItem.quantity, recipeQty);
          
          if (isDepleted) {
            updated.splice(matchIdx, 1); // Delete item if fully depleted
          } else {
            updated[matchIdx] = {
              ...pantryItem,
              quantity: newQty
            };
          }
        }
      });
      return updated;
    });
  }, []);

  // Add Missing Recipe Gaps to the Shopping List
  const handleAddNeedToShopping = useCallback((needs: string[]) => {
    setShoppingList(prev => {
      let updated = [...prev];
      needs.forEach(need => {
        const needClean = need.trim().toLowerCase();
        if (!needClean) return;

        // Try to parse quantities like "300g cream" or "2 onions"
        const qtyMatch = needClean.match(/^([\d.,\s\w]+)?\s+([a-zA-Z\s]+)$/);
        let name = needClean;
        let qty = '1 unit';

        if (qtyMatch && qtyMatch[1] && qtyMatch[2]) {
          const possibleQty = qtyMatch[1].trim();
          if (/[\d]/.test(possibleQty)) {
            qty = possibleQty;
            name = qtyMatch[2].trim();
          }
        }

        const existingIdx = updated.findIndex(item => item.name === name);
        if (existingIdx > -1) {
          const existing = updated[existingIdx];
          updated[existingIdx] = {
            ...existing,
            quantity: combineQuantities(existing.quantity, qty)
          };
        } else {
          updated.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name,
            quantity: qty,
            completed: false
          });
        }
      });
      return updated;
    });
    // Toggle active tab to shopping so user is greeted with their list!
    setActiveTab('shopping');
  }, []);

  // Sync bought items from Shopping List back into pantry inventory
  const handleAddToPantryFromShopping = useCallback((items: { name: string; quantity: string }[]) => {
    setInventory(prev => {
      let updated = [...prev];
      items.forEach(item => {
        const nameLower = item.name.trim().toLowerCase();
        if (!nameLower) return;

        // Default safety expiration date of 7 days from today for bought items
        const defaultExp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const existingIdx = updated.findIndex(i => i.name.toLowerCase() === nameLower);
        if (existingIdx > -1) {
          const existingItem = updated[existingIdx];
          updated[existingIdx] = {
            ...existingItem,
            quantity: combineQuantities(existingItem.quantity, item.quantity)
          };
        } else {
          updated.push({
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}-${nameLower}`,
            name: nameLower,
            quantity: item.quantity,
            expirationDate: defaultExp
          });
        }
      });
      return updated;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    setCurrentUser(null);
  }, []);
  
  if (!currentUser) {
    return <AuthPage onAuthSuccess={setCurrentUser} authService={authService} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <Header 
        userEmail={currentUser.email}
        isInventoryVisible={isInventoryVisible}
        onToggleInventory={() => setIsInventoryVisible(prev => !prev)}
        onLogout={handleLogout}
      />
      <main className="container mx-auto p-4 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 lg:gap-8">
          
          {/* Left panel column */}
          {isInventoryVisible && (
            <div className="lg:col-span-6 xl:col-span-5 flex flex-col gap-4">
              
              {/* Tab navigation */}
              <div className="flex border border-slate-200 bg-slate-100 p-1.5 rounded-2xl shadow-inner shrink-0">
                <button
                  onClick={() => setActiveTab('pantry')}
                  className={`flex-grow text-center py-2 text-xs font-extrabold rounded-xl transition-all ${
                    activeTab === 'pantry' 
                      ? 'bg-white text-emerald-600 shadow' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Manage Pantry
                </button>
                <button
                  onClick={() => setActiveTab('shopping')}
                  className={`flex-grow text-center py-2 text-xs font-extrabold rounded-xl transition-all relative ${
                    activeTab === 'shopping' 
                      ? 'bg-white text-emerald-600 shadow' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Shopping List
                  {shoppingList.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] h-4.5 w-4.5 rounded-full flex items-center justify-center font-bold">
                      {shoppingList.length}
                    </span>
                  )}
                </button>
              </div>

              {/* Tab Contents */}
              <div className="flex-grow">
                {activeTab === 'pantry' ? (
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
                ) : (
                  <ShoppingListPanel 
                    shoppingList={shoppingList}
                    setShoppingList={setShoppingList}
                    onAddToPantry={handleAddToPantryFromShopping}
                  />
                )}
              </div>
            </div>
          )}

          {/* Right panel column */}
          <div className={isInventoryVisible ? "lg:col-span-6 xl:col-span-7" : "lg:col-span-12"}>
            <RecipePanel 
              recipes={recipes} 
              isLoading={isGenerating} 
              error={error} 
              hasInventory={inventory.length > 0}
              onCookRecipe={handleCookRecipe}
              onAddNeedToShopping={handleAddNeedToShopping}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
