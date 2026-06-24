import React, { useState } from 'react';
import { ShoppingItem, InventoryItem } from '../types';
import { PlusIcon, TrashIcon, CheckIcon, ArchiveIcon } from './icons';

interface ShoppingListPanelProps {
  shoppingList: ShoppingItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<ShoppingItem[]>>;
  onAddToPantry: (items: { name: string; quantity: string }[]) => void;
}

export const ShoppingListPanel: React.FC<ShoppingListPanelProps> = ({ 
  shoppingList, 
  setShoppingList,
  onAddToPantry
}) => {
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    const newItem: ShoppingItem = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: newItemName.trim().toLowerCase(),
      quantity: newItemQty.trim() || '1 unit',
      completed: false
    };

    setShoppingList(prev => [...prev, newItem]);
    setNewItemName('');
    setNewItemQty('');
  };

  const toggleItemCompleted = (id: string) => {
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const deleteItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const clearCompleted = () => {
    setShoppingList(prev => prev.filter(item => !item.completed));
  };

  const handleTransferToPantry = () => {
    const completedItems = shoppingList.filter(item => item.completed);
    if (completedItems.length === 0) return;

    // Send to parent to add to pantry
    onAddToPantry(completedItems.map(item => ({
      name: item.name,
      quantity: item.quantity
    })));

    // Remove transferred items from shopping list
    setShoppingList(prev => prev.filter(item => !item.completed));
  };

  return (
    <div className="flex flex-col h-full bg-white p-5 rounded-xl border border-slate-200/80">
      <h3 className="text-lg font-bold text-slate-800 flex items-center mb-1">
        Shopping List
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        Track missing items from your suggested recipes or add your own staples.
      </p>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="grid grid-cols-12 gap-2 mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
        <div className="col-span-6">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Item Name</label>
          <input
            type="text"
            placeholder="e.g., Spinach"
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="col-span-4">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Qty / Unit</label>
          <input
            type="text"
            placeholder="e.g., 200g"
            value={newItemQty}
            onChange={(e) => setNewItemQty(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500"
          />
        </div>
        <div className="col-span-2 flex items-end">
          <button
            type="submit"
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg flex items-center justify-center transition-colors shadow"
            title="Add to shopping list"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
        </div>
      </form>

      {/* Shopping List Items */}
      <div className="flex-grow overflow-y-auto space-y-2 max-h-[300px] pr-1">
        {shoppingList.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <ArchiveIcon className="h-10 w-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">Your shopping list is empty</p>
            <p className="text-xs mt-0.5">Missing ingredients from recipes will appear here.</p>
          </div>
        ) : (
          shoppingList.map((item) => (
            <div 
              key={item.id} 
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                item.completed 
                  ? 'bg-slate-50/70 border-slate-200 text-slate-400 line-through' 
                  : 'bg-white border-slate-200 text-slate-700 shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => toggleItemCompleted(item.id)}
                  className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                    item.completed 
                      ? 'bg-emerald-500 border-emerald-500 text-white' 
                      : 'border-slate-300 hover:border-emerald-500 bg-white'
                  }`}
                >
                  {item.completed && <CheckIcon className="h-3 w-3" />}
                </button>
                <div className="min-w-0">
                  <p className="font-semibold text-sm capitalize truncate">{item.name}</p>
                  <p className="text-xs text-slate-400 font-mono">{item.quantity}</p>
                </div>
              </div>
              <button
                onClick={() => deleteItem(item.id)}
                className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                title="Delete item"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Action Footer */}
      {shoppingList.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
          {shoppingList.some(i => i.completed) && (
            <button
              onClick={handleTransferToPantry}
              className="flex-grow flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 text-xs font-bold rounded-lg transition-colors border border-emerald-200/50"
            >
              <ArchiveIcon className="h-3.5 w-3.5" />
              Add Bought to Pantry
            </button>
          )}
          <button
            onClick={clearCompleted}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-lg transition-colors"
          >
            Clear Bought
          </button>
        </div>
      )}
    </div>
  );
};
