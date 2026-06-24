import React, { useState, useCallback, useMemo } from 'react';
import { InventoryItem } from '../types';
import { PlusIcon, TrashIcon, ChevronDownIcon, WarningIcon, PencilIcon, CheckIcon, XMarkIcon } from './icons';

interface InventoryListProps {
  inventory: InventoryItem[];
  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
}

const baseInputClasses = "w-full px-2 py-1 border rounded-md bg-white text-sm focus:ring-2 focus:border-emerald-500 transition";

export const InventoryList: React.FC<InventoryListProps> = ({ inventory, setInventory }) => {
  const [newItem, setNewItem] = useState({ name: '', quantity: '', expirationDate: '' });
  const [sortBy, setSortBy] = useState<'name' | 'expirationDate'>('name');
  const [isListExpanded, setIsListExpanded] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingItemName, setEditingItemName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);

  const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewItem(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };
  
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItem.name.trim() && !inventory.some(item => item.name.toLowerCase() === newItem.name.trim().toLowerCase())) {
      setInventory(prev => [...prev, {
        id: `${Date.now()}-${newItem.name}`,
        ...newItem,
        name: newItem.name.trim().toLowerCase(),
      }]);
      setNewItem({ name: '', quantity: '', expirationDate: '' });
    }
  };

  const handleRemoveItem = (idToRemove: string) => {
    setInventory(prev => prev.filter(item => item.id !== idToRemove));
  };
  
  const handleUpdateItem = (id: string, field: keyof Omit<InventoryItem, 'id'>, value: string) => {
    setInventory(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const handleStartEdit = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setEditingItemName(item.name);
    setEditError(null);
  };

  const handleSaveEdit = () => {
    const trimmedName = editingItemName.trim();
    if (trimmedName === '') {
      setEditError('Name cannot be empty.');
      return;
    }
    const isDuplicate = inventory.some(
      i => i.id !== editingItemId && i.name.toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setEditError('This item already exists in your pantry.');
      return;
    }
    
    if (editingItemId) {
      handleUpdateItem(editingItemId, 'name', trimmedName);
    }
    setEditingItemId(null);
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingItemName('');
    setEditError(null);
  };

  const getExpirationClasses = (dateString?: string): string => {
    if (!dateString) return 'border-slate-300';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expDate = new Date(dateString);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'border-red-400 focus:ring-red-500 focus:border-red-500';
    if (diffDays <= 7) return 'border-amber-400 focus:ring-amber-500 focus:border-amber-500';
    return 'border-slate-300';
  };

  const expiringSoonItems = useMemo(() => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const sevenDaysFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);

      return inventory
          .filter(item => {
              if (!item.expirationDate) return false;
              const expDate = new Date(item.expirationDate);
              return expDate >= today && expDate <= sevenDaysFromNow;
          })
          .sort((a, b) => new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime());
  }, [inventory]);

  const sortedInventory = useMemo(() => {
    return [...inventory].sort((a, b) => {
        if (sortBy === 'name') {
            return a.name.localeCompare(b.name);
        }
        if (sortBy === 'expirationDate') {
            if (!a.expirationDate && !b.expirationDate) return a.name.localeCompare(b.name);
            if (!a.expirationDate) return 1; // items without date go last
            if (!b.expirationDate) return -1;
            const dateA = new Date(a.expirationDate).getTime();
            const dateB = new Date(b.expirationDate).getTime();
            if (dateA === dateB) return a.name.localeCompare(b.name);
            return dateA - dateB;
        }
        return 0;
    });
  }, [inventory, sortBy]);

  const SortableHeader: React.FC<{ title: string; value: 'name' | 'expirationDate' }> = ({ title, value }) => (
    <button
      onClick={() => setSortBy(value)}
      className="text-left font-semibold text-slate-500 hover:text-slate-800 transition-colors flex items-center"
    >
      {title}
      {sortBy === value && <span className="ml-1">▾</span>}
    </button>
  );

  return (
    <div className="mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-700">On-Hand Inventory</h2>
        <button 
          onClick={() => setIsListExpanded(!isListExpanded)} 
          className="flex items-center px-3 py-1 bg-slate-100 text-slate-600 font-semibold text-sm rounded-lg hover:bg-slate-200 transition-colors"
          aria-expanded={isListExpanded}
          aria-controls="inventory-list-container"
        >
          {isListExpanded ? 'Hide' : 'View'}
          <ChevronDownIcon className={`h-5 w-5 ml-1 transition-transform ${isListExpanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div id="inventory-list-container" className={`transition-all duration-300 ease-in-out overflow-hidden ${isListExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {expiringSoonItems.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <div className="flex items-start">
                    <WarningIcon className="h-5 w-5 text-amber-500 mr-2 flex-shrink-0" />
                    <div>
                        <h4 className="font-semibold text-amber-800">Expiring Soon</h4>
                        <p className="text-amber-700">
                            {expiringSoonItems.map(item => item.name).join(', ')}
                        </p>
                    </div>
                </div>
            </div>
        )}
        
        <div className="flex-grow overflow-y-auto pr-2 -mr-2 flex flex-col">
          {inventory.length > 0 ? (
            <div className="overflow-x-auto">
              <div className="space-y-2 min-w-[500px]">
                <div className="grid grid-cols-[1fr,100px,150px,80px] gap-2 px-2 text-sm">
                  <SortableHeader title="Item" value="name" />
                  <span className="font-semibold text-slate-500">Quantity</span>
                  <SortableHeader title="Expires" value="expirationDate" />
                  <span className="text-right font-semibold text-slate-500 pr-2">Actions</span>
                </div>
                {sortedInventory.map(item => {
                  const isEditing = editingItemId === item.id;
                  return (
                  <div key={item.id}>
                    <div className="grid grid-cols-[1fr,100px,150px,80px] gap-2 items-center p-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingItemName}
                          onChange={(e) => setEditingItemName(e.target.value)}
                          className={`${baseInputClasses} border-emerald-300 capitalize`}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                        />
                      ) : (
                        <span className="font-medium text-base text-slate-800 capitalize truncate" title={item.name}>{item.name}</span>
                      )}
                      <input
                        type="text"
                        value={item.quantity}
                        onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)}
                        placeholder="Qty"
                        className={`${baseInputClasses} border-slate-300`}
                        aria-label={`Quantity for ${item.name}`}
                      />
                      <input
                        type="date"
                        value={item.expirationDate}
                        onChange={(e) => handleUpdateItem(item.id, 'expirationDate', e.target.value)}
                        className={`${baseInputClasses} ${getExpirationClasses(item.expirationDate)}`}
                        aria-label={`Expiration date for ${item.name}`}
                      />
                      <div className="flex items-center justify-end">
                        {isEditing ? (
                          <>
                            <button onClick={handleSaveEdit} className="p-2 text-slate-400 hover:text-emerald-500" aria-label={`Save changes for ${item.name}`}>
                              <CheckIcon className="h-5 w-5" />
                            </button>
                             <button onClick={handleCancelEdit} className="p-2 text-slate-400 hover:text-red-500" aria-label={`Cancel editing ${item.name}`}>
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </>
                        ) : (
                           <>
                            <button onClick={() => handleStartEdit(item)} className="p-2 text-slate-400 hover:text-emerald-500 transition-colors" aria-label={`Edit ${item.name}`}>
                              <PencilIcon className="h-5 w-5" />
                            </button>
                            <button onClick={() => handleRemoveItem(item.id)} className="p-2 text-slate-400 hover:text-red-500 transition-colors" aria-label={`Remove ${item.name}`}>
                              <TrashIcon className="h-5 w-5" />
                            </button>
                           </>
                        )}
                      </div>
                    </div>
                    {isEditing && editError && <p className="text-red-600 text-xs px-2 mt-1">{editError}</p>}
                  </div>
                )})}
              </div>
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8 flex-grow flex flex-col justify-center">
              <p>Your pantry is empty.</p>
              <p className="text-sm">Add items by scanning or manually below.</p>
            </div>
          )}
        </div>
        
        <form onSubmit={handleAddItem} className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-[1fr,100px,150px,80px] gap-2 items-end">
          <div className="flex-grow">
            <label htmlFor="itemName" className="text-xs font-medium text-slate-600">Item Name</label>
            <input
              id="itemName"
              name="name"
              type="text"
              value={newItem.name}
              onChange={handleFormInputChange}
              placeholder="e.g., Cherry Tomatoes"
              className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
              required
            />
          </div>
          <div>
            <label htmlFor="itemQty" className="text-xs font-medium text-slate-600">Quantity</label>
            <input
              id="itemQty"
              name="quantity"
              type="text"
              value={newItem.quantity}
              onChange={handleFormInputChange}
              placeholder="e.g., 250g"
              className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>
          <div>
            <label htmlFor="itemExp" className="text-xs font-medium text-slate-600">Expiration</label>
            <input
              id="itemExp"
              name="expirationDate"
              type="date"
              value={newItem.expirationDate}
              onChange={handleFormInputChange}
              className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
            />
          </div>
          <button type="submit" className="h-10 px-4 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-slate-300 font-semibold text-sm" aria-label="Add item">
            Add
          </button>
        </form>
      </div>
    </div>
  );
};