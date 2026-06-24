import React from 'react';
import { ChefHatIcon, PantryIcon } from './icons';

interface HeaderProps {
  userEmail: string;
  isInventoryVisible: boolean;
  onToggleInventory: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ userEmail, isInventoryVisible, onToggleInventory, onLogout }) => {
  return (
    <header className="bg-white shadow-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
        <div className="flex items-center">
          <ChefHatIcon className="h-8 w-8 text-emerald-500" />
          <h1 className="ml-3 text-2xl font-bold text-slate-800 tracking-tight">Pantry Chef AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600 hidden md:block">{userEmail}</span>
          <button
            onClick={onToggleInventory}
            className="flex items-center px-4 py-2 bg-slate-100 text-slate-700 font-semibold rounded-lg hover:bg-slate-200 transition-colors"
          >
            <PantryIcon className="h-5 w-5 mr-2" />
            {isInventoryVisible ? 'Hide Pantry' : 'Manage Pantry'}
          </button>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-slate-600 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors"
            title="Log out"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};
