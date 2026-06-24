export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = (error) => reject(error);
  });
};

export const getMimeType = (file: File): string => {
    return file.type;
}

/**
 * Parses a quantity string into a numeric value and its unit (e.g. "500g" -> { value: 500, unit: "g" })
 */
export const parseQuantity = (qStr: string): { value: number; unit: string } => {
  const trimmed = (qStr || '').trim();
  if (!trimmed) return { value: 1, unit: '' };
  
  // Match digits (with decimal point/comma) and the trailing unit letters/words
  const match = trimmed.match(/^([\d.,\s]+)?\s*(.*)$/);
  if (!match) return { value: 1, unit: trimmed };
  
  const numStr = (match[1] || '').replace(/[\s,]/g, '.');
  const value = numStr ? parseFloat(numStr) : 1;
  const unit = (match[2] || '').trim();
  
  return { value: isNaN(value) ? 1 : value, unit };
};

/**
 * Combines two quantity strings together if they share the same unit.
 */
export const combineQuantities = (q1: string, q2: string): string => {
  if (!q1) return q2 || '';
  if (!q2) return q1 || '';
  
  const p1 = parseQuantity(q1);
  const p2 = parseQuantity(q2);
  
  // Normalize units
  const u1 = p1.unit.toLowerCase();
  const u2 = p2.unit.toLowerCase();
  
  if (u1 === u2 && p1.value && p2.value) {
    const sum = p1.value + p2.value;
    const formattedSum = Number(sum.toFixed(2));
    return `${formattedSum} ${p1.unit}`.trim();
  }
  
  // Mismatched units - concat them
  return `${q1}, ${q2}`;
};

/**
 * Deducts a recipe ingredient quantity from a matching pantry item quantity.
 */
export const deductQuantity = (pantryQty: string, recipeQty: string): { newQty: string; isDepleted: boolean } => {
  if (!pantryQty) return { newQty: '', isDepleted: true };
  if (!recipeQty) return { newQty: pantryQty, isDepleted: false };

  const p1 = parseQuantity(pantryQty);
  const p2 = parseQuantity(recipeQty);

  const u1 = p1.unit.toLowerCase();
  const u2 = p2.unit.toLowerCase();

  // If units match (or recipe is unitless), perform subtraction
  if ((u1 === u2 || !u2) && p1.value && p2.value) {
    const difference = p1.value - p2.value;
    if (difference <= 0) {
      return { newQty: '0', isDepleted: true };
    }
    const formattedDiff = Number(difference.toFixed(2));
    return { newQty: `${formattedDiff} ${p1.unit}`.trim(), isDepleted: false };
  }

  // Fallback: if units can't match, assume full depletion or custom reduction
  return { newQty: '0', isDepleted: true };
};

