const API_URL = 'https://world.openfoodfacts.org/api/v2/product/';

interface OpenFoodFactsResponse {
  status: number;
  product?: {
    product_name: string;
  };
}

export const fetchProductByBarcode = async (barcode: string): Promise<{ name: string } | null> => {
  try {
    const response = await fetch(`${API_URL}${barcode}`);
    if (!response.ok) {
      console.warn(`Product with barcode ${barcode} not found or API error.`);
      return null;
    }
    const data: OpenFoodFactsResponse = await response.json();
    
    if (data.status === 1 && data.product && data.product.product_name) {
      return { name: data.product.product_name };
    }
    return null;
  } catch (error) {
    console.error("Error fetching product by barcode:", error);
    throw new Error("Failed to fetch product information.");
  }
};
