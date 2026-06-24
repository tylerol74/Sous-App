import { GeneratedRecipes, InventoryItem } from '../types';

export type ImageScanContext = 'pantry' | 'receipt';

/**
 * Sends a base64 snapshot image to the server-side API to identify items and quantities.
 */
export const identifyItemsFromImage = async (
  imageData: string, 
  mimeType: string, 
  context: ImageScanContext
): Promise<{ name: string, quantity: string }[]> => {
  try {
    const response = await fetch("/api/image/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData, mimeType, context }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to identify items from the image.");
    }

    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error identifying items from image via backend:", error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "Failed to identify items from the image. Please try again with a clearer picture."
    );
  }
};

/**
 * Requests recipe suggestions from the server, passing the full inventory list
 * (with quantities and expiration dates) to prioritize expiring items.
 */
export const getRecipes = async (
  inventory: InventoryItem[], 
  timeConstraint?: string,
  cuisine?: string,
  diet?: string,
  mealType?: string
): Promise<GeneratedRecipes> => {
  try {
    const response = await fetch("/api/recipes/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inventory,
        timeConstraint,
        cuisine,
        diet,
        mealType,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to generate recipes.");
    }

    const data = await response.json();
    return data.recipes || [];
  } catch (error) {
    console.error("Error generating recipes via backend:", error);
    throw new Error(
      error instanceof Error 
        ? error.message 
        : "Failed to generate recipes. The AI model might be busy. Please try again later."
    );
  }
};

/**
 * Sends a raw barcode or a barcode snapshot image to the backend to resolve the product name.
 */
export const identifyBarcodeProduct = async (
  params: { barcode?: string; imageData?: string; mimeType?: string }
): Promise<{ name: string | null }> => {
  try {
    const response = await fetch("/api/barcode/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      return { name: null };
    }

    const data = await response.json();
    return { name: data.name || null };
  } catch (error) {
    console.error("Barcode identification failed:", error);
    return { name: null };
  }
};
