export interface User {
  email: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  quantity: string;
  expirationDate: string; // YYYY-MM-DD format
}

export interface Source {
  uri: string;
  title: string;
}

export interface RecipeIngredients {
  have: string[];
  need: string[];
}

export interface Recipe {
  title: string;
  description: string;
  ingredients: RecipeIngredients;
  instructions: string[];
  source?: Source;
  isCreative?: boolean;
}

export type GeneratedRecipes = Recipe[];

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: string;
  completed: boolean;
}