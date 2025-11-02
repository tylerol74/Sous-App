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

export interface GeneratedRecipes {
  text: string;
  sources: Source[];
}