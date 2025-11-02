import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedRecipes, Source } from '../types';

const getAi = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY environment variable not set");
    }
    return new GoogleGenAI({ apiKey });
};

const itemSchema = {
  type: Type.OBJECT,
  properties: {
    name: { 
      type: Type.STRING,
      description: "The name of the food item."
    },
    quantity: { 
      type: Type.STRING,
      description: "The estimated quantity of the item (e.g., '1 liter', '500g', '6 count')."
    }
  },
  required: ['name', 'quantity']
};

const commonSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: itemSchema
    }
  },
  required: ['items']
};


export type ImageScanContext = 'pantry' | 'receipt';

export const identifyItemsFromImage = async (
  imageData: string, 
  mimeType: string, 
  context: ImageScanContext
): Promise<{name: string, quantity: string}[]> => {
  try {
    const ai = getAi();
    
    const contextPrompts = {
        pantry: "Analyze this image of a pantry or fridge. Identify all the food items and estimate their quantity. Return the result as a JSON object.",
        receipt: "Analyze this image of a grocery receipt. Extract all the food items listed and their quantities if available. Return the result as a JSON object."
    };

    const textPart = { text: contextPrompts[context] };
    const imagePart = {
        inlineData: {
            data: imageData,
            mimeType: mimeType
        }
    };
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: { parts: [textPart, imagePart] },
        config: {
            responseMimeType: "application/json",
            responseSchema: commonSchema,
        },
    });

    const jsonText = response.text.trim();
    if (!jsonText) {
        console.warn("Gemini API returned an empty response for image recognition.");
        return [];
    }

    const parsed = JSON.parse(jsonText);
    return parsed.items || [];

  } catch (error) {
    console.error(`Error identifying items from ${context} image:`, error);
    throw new Error(`Failed to identify items from the image. Please try again with a clearer picture.`);
  }
};

export const getRecipes = async (
    ingredients: string[], 
    timeConstraint?: string,
    cuisine?: string,
    diet?: string,
    mealType?: string
): Promise<GeneratedRecipes> => {
    try {
        const ai = getAi();
        
        let prompt = `I have the following ingredients: ${ingredients.join(', ')}. Please suggest at least 5 different recipes. For each recipe, provide a title, a brief description, a list of ingredients (separating what I have from what I'll need), and clear instructions. One of these recipes should be a unique, creative idea you generate yourself. Format the entire response using Markdown for readability.`;
        
        if (cuisine) {
            prompt += ` I'm looking for a recipe with a ${cuisine} cuisine style.`;
        }
        if (diet) {
            prompt += ` The recipe must be ${diet}.`;
        }
        if (mealType) {
            prompt += ` It should be a recipe for ${mealType}.`;
        }
        if (timeConstraint && parseInt(timeConstraint) > 0) {
            prompt += ` I only have ${timeConstraint} minutes to cook.`;
        }
        
        prompt += ' Use Google Search for up-to-date recipes and provide links to the original sources for the non-unique recipes.';
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                tools: [{ googleSearch: {} }],
            },
        });
        
        const text = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        const sources: Source[] = groundingChunks
            .filter(chunk => chunk.web && chunk.web.uri && chunk.web.title)
            .map(chunk => ({
                uri: chunk.web.uri!,
                title: chunk.web.title!,
            }));
            
        // Remove duplicate sources
        const uniqueSources = Array.from(new Map(sources.map(item => [item.uri, item])).values());
        
        return { text, sources: uniqueSources };

    } catch (error) {
        console.error("Error generating recipes:", error);
        throw new Error("Failed to generate recipes. The AI model might be busy. Please try again later.");
    }
};