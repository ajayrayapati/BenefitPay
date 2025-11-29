import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CardType, CreditCard, RecommendationResult } from "../types";

// Initialize Gemini Client
// CRITICAL: Ensure process.env.API_KEY is available in your environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = 'gemini-2.5-flash';

/**
 * Step 1: Search for cards based on bank name
 */
export const searchCardsByBank = async (bankName: string): Promise<string[]> => {
  const prompt = `List the top 5 most popular current credit card names offered by ${bankName}. Return only the card names as a simple JSON array of strings. Do not include markdown formatting.`;
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    
    const text = response.text;
    if (!text) return [];
    return JSON.parse(text) as string[];
  } catch (error) {
    console.error("Error searching cards:", error);
    return [];
  }
};

/**
 * Step 2: Get detailed info (Rewards & Benefits) for a selected card
 */
export const fetchCardDetails = async (cardName: string, bankName: string): Promise<Partial<CreditCard>> => {
  const prompt = `Provide detailed reward rates (e.g., "3x on Dining") and key benefits (specifically warranties, purchase protection, travel insurance) for the credit card: "${bankName} ${cardName}".
  
  Determine the network (VISA, MASTERCARD, AMEX, DISCOVER).
  suggest a hex color code that represents the card branding (e.g. Sapphire blue, Amex Gold, etc).
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      network: { type: Type.STRING, enum: [CardType.VISA, CardType.MASTERCARD, CardType.AMEX, CardType.DISCOVER, CardType.OTHER] },
      colorTheme: { type: Type.STRING, description: "A hex color code #RRGGBB" },
      rewards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            category: { type: Type.STRING },
            rate: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      },
      benefits: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            description: { type: Type.STRING }
          }
        }
      }
    },
    required: ["network", "colorTheme", "rewards", "benefits"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from Gemini");
    return JSON.parse(text);
  } catch (error) {
    console.error("Error fetching card details:", error);
    throw error;
  }
};

/**
 * Step 3: Recommend a card based on purchase context
 */
export const recommendBestCard = async (
  query: string, 
  userCards: CreditCard[]
): Promise<RecommendationResult | null> => {
  if (userCards.length === 0) return null;

  // Simplify the wallet for the prompt to save tokens
  const walletSummary = userCards.map(c => ({
    id: c.id,
    name: `${c.bankName} ${c.cardName}`,
    rewards: c.rewards,
    benefits: c.benefits
  }));

  const prompt = `
  User is making a purchase/transaction described as: "${query}".
  
  Here is their wallet:
  ${JSON.stringify(walletSummary, null, 2)}
  
  Analyze the merchant category code (MCC) implications of the purchase query.
  Compare the reward rates and relevant protections (e.g., if buying electronics, look for warranty; if travel, look for insurance).
  
  Select the single best card ID from the wallet.
  Explain why in one short sentence.
  Estimate the reward (e.g., "Earns 3x points" or "Extended Warranty covered").
  `;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      cardId: { type: Type.STRING },
      reasoning: { type: Type.STRING },
      estimatedReward: { type: Type.STRING }
    },
    required: ["cardId", "reasoning"]
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as RecommendationResult;
  } catch (error) {
    console.error("Error recommending card:", error);
    return null;
  }
};
