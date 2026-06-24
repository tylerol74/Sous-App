import React, { useState } from 'react';
import { InventoryItem } from '../types';
import { PlusIcon, TrashIcon } from './icons';

interface ConfirmationPanelProps {
  initialItems: { name: string; quantity: string }[];
  onConfirm: (finalItems: Omit<InventoryItem, 'id'>[]) => void;
  onClose: () => void;
  context: 'pantry' | 'receipt' | 'barcode';
}

type EditableItem = {
    tempId: string;
    name: string;
    quantity: string;
    expirationDate: string;
};

const baseInputClasses = "w-full px-2 py-1 border rounded-md bg-white text-base focus:ring-2 focus:border-emerald-500 transition border-slate-300";

export const ConfirmationPanel: React.FC<ConfirmationPanelProps> = ({ initialItems, onConfirm, onClose, context }) => {
    const [items, setItems] = useState<EditableItem[]>(() => 
        initialItems.map((item, index) => ({
            ...item,
            tempId: `item-${index}-${Date.now()}`,
            expirationDate: ''
        }))
    );
    const [newItem, setNewItem] = useState({ name: '', quantity: '', expirationDate: '' });

    const handleItemChange = (tempId: string, field: keyof Omit<EditableItem, 'tempId'>, value: string) => {
        setItems(currentItems => 
            currentItems.map(item => 
                item.tempId === tempId ? { ...item, [field]: value } : item
            )
        );
    };

    const handleRemoveItem = (tempId: string) => {
        setItems(currentItems => currentItems.filter(item => item.tempId !== tempId));
    };

    const handleFormInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewItem(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.name.trim()) {
            setItems(prev => [...prev, {
                ...newItem,
                name: newItem.name.trim(),
                tempId: `new-${Date.now()}`
            }]);
            setNewItem({ name: '', quantity: '', expirationDate: '' });
        }
    };
    
    const handleConfirm = () => {
        const finalItems = items
            .filter(item => item.name.trim())
            .map(({ tempId, ...rest }) => rest);
        onConfirm(finalItems);
    };

    const contextText = {
        pantry: {
            title: "Confirm Scanned Items",
            description: "Review and edit the items found from your pantry.",
        },
        receipt: {
            title: "Confirm Scanned Items",
            description: "Review and edit the items found from your receipt.",
        },
        barcode: {
            title: "Confirm Scanned Product",
            description: "Confirm the product details below. If the name is blank, please enter it manually."
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
                <div className="p-4 border-b border-slate-200">
                    <h3 className="text-lg font-semibold text-center text-slate-800">{contextText[context].title}</h3>
                    <p className="text-sm text-center text-slate-500">{contextText[context].description}</p>
                </div>
                
                <div className="p-4 flex-grow overflow-y-auto">
                    <div className="overflow-x-auto">
                        <div className="min-w-[550px]">
                            {items.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="grid grid-cols-[1fr,100px,150px,40px] gap-2 px-2 text-sm font-semibold text-slate-500">
                                        <span>Item</span>
                                        <span>Quantity</span>
                                        <span>Expires</span>
                                        <span className="sr-only">Actions</span>
                                    </div>
                                    {items.map(item => (
                                        <div key={item.tempId} className="grid grid-cols-[1fr,100px,150px,40px] gap-2 items-center p-2 rounded-lg bg-slate-50">
                                            <input
                                                type="text"
                                                value={item.name}
                                                onChange={(e) => handleItemChange(item.tempId, 'name', e.target.value)}
                                                className={baseInputClasses}
                                            />
                                            <input
                                                type="text"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(item.tempId, 'quantity', e.target.value)}
                                                className={baseInputClasses + ' text-sm'}
                                            />
                                            <input
                                                type="date"
                                                value={item.expirationDate}
                                                onChange={(e) => handleItemChange(item.tempId, 'expirationDate', e.target.value)}
                                                className={baseInputClasses + ' text-sm'}
                                            />
                                            <button onClick={() => handleRemoveItem(item.tempId)} className="p-2 text-slate-400 hover:text-red-500" aria-label={`Remove ${item.name}`}>
                                                <TrashIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-center text-slate-500 py-8">No items were detected. You can add them manually below.</p>
                            )}
                        </div>
                    </div>

                    <form onSubmit={handleAddItem} className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-[1fr,100px,150px,auto] gap-2 items-end">
                        <input
                            name="name"
                            type="text"
                            value={newItem.name}
                            onChange={handleFormInputChange}
                            placeholder="Add another item..."
                            className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                        />
                        <input
                            name="quantity"
                            type="text"
                            value={newItem.quantity}
                            onChange={handleFormInputChange}
                            placeholder="Qty"
                            className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                        />
                         <input
                            name="expirationDate"
                            type="date"
                            value={newItem.expirationDate}
                            onChange={handleFormInputChange}
                            className="w-full px-2 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                        />
                        <button type="submit" className="h-10 p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors disabled:bg-slate-300" aria-label="Add item to confirmation list">
                            <PlusIcon className="h-6 w-6" />
                        </button>
                    </form>
                </div>

                <div className="p-4 flex gap-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
                    <button onClick={onClose} className="flex-1 px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleConfirm} className="flex-1 px-4 py-2 bg-emerald-500 text-white font-semibold rounded-lg hover:bg-emerald-600 transition-colors">
                        Add All to Pantry
                    </button>
                </div>
            </div>
        </div>
    );
};