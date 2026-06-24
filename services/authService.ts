import { User, InventoryItem, ShoppingItem } from '../types';

const SESSION_KEY = 'pantryChefSession';

export const signup = async (email: string, password: string): Promise<User> => {
  const response = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to sign up. Email might already be taken.");
  }

  const data = await response.json();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
  return data.user;
};

export const login = async (email: string, password: string): Promise<User> => {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Invalid email or password.");
  }

  const data = await response.json();
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(data.user));
  return data.user;
};

export const logout = async (): Promise<void> => {
  sessionStorage.removeItem(SESSION_KEY);
};

export const getCurrentUser = (): User | null => {
  try {
    const user = sessionStorage.getItem(SESSION_KEY);
    return user ? JSON.parse(user) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Cloud Sync: Fetch pantry from the server
 */
export const syncPantryFromServer = async (email: string): Promise<InventoryItem[] | null> => {
  try {
    const response = await fetch(`/api/sync/pantry?email=${encodeURIComponent(email)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.pantry;
  } catch (err) {
    console.error("Failed to sync pantry from server:", err);
    return null;
  }
};

/**
 * Cloud Sync: Backup pantry to the server
 */
export const syncPantryToServer = async (email: string, pantry: InventoryItem[]): Promise<boolean> => {
  try {
    const response = await fetch("/api/sync/pantry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, pantry }),
    });
    return response.ok;
  } catch (err) {
    console.error("Failed to backup pantry to server:", err);
    return false;
  }
};

/**
 * Cloud Sync: Fetch shopping list from the server
 */
export const syncShoppingFromServer = async (email: string): Promise<ShoppingItem[] | null> => {
  try {
    const response = await fetch(`/api/sync/shopping?email=${encodeURIComponent(email)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.shoppingList;
  } catch (err) {
    console.error("Failed to sync shopping list from server:", err);
    return null;
  }
};

/**
 * Cloud Sync: Backup shopping list to the server
 */
export const syncShoppingToServer = async (email: string, shoppingList: ShoppingItem[]): Promise<boolean> => {
  try {
    const response = await fetch("/api/sync/shopping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, shoppingList }),
    });
    return response.ok;
  } catch (err) {
    console.error("Failed to backup shopping list to server:", err);
    return false;
  }
};
