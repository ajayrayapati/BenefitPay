
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CardType, CreditCard, RecommendationResult } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_FAST = 'gemini-2.5-flash';

// --- FALLBACK DATA FOR QUOTA LIMITS ---
const FALLBACK_COMMON_CARDS: Record<string, string[]> = {
  'CHASE': ['Sapphire Reserve', 'Sapphire Preferred', 'Freedom Unlimited', 'Freedom Flex', 'Slate Edge'],
  'AMEX': ['Platinum Card', 'Gold Card', 'Green Card', 'Blue Cash Preferred', 'EveryDay Credit Card'],
  'AMERICAN EXPRESS': ['Platinum Card', 'Gold Card', 'Green Card', 'Blue Cash Preferred', 'EveryDay Credit Card'],
  'CITI': ['Double Cash', 'Custom Cash', 'Premier Card', 'Simplicity', 'Rewards+'],
  'CAPITAL ONE': ['Venture X', 'Venture', 'Quicksilver', 'Savor', 'Platinum'],
  'DISCOVER': ['It Cash Back', 'It Miles', 'It Chrome', 'Secure', 'Student Cash Back'],
  'BOA': ['Premium Rewards', 'Customized Cash', 'Unlimited Cash', 'Travel Rewards', 'BankAmericard'],
  'BANK OF AMERICA': ['Premium Rewards', 'Customized Cash', 'Unlimited Cash', 'Travel Rewards', 'BankAmericard'],
  'WELLS FARGO': ['Active Cash', 'Autograph', 'Reflect', 'Fargo'],
  'APPLE': ['Apple Card'],
  'DEFAULT': ['Premium Rewards', 'Cash Back', 'Travel Card', 'Points Card', 'Platinum']
};

// Helper: Clean JSON string from Markdown
const cleanJson = (text: string): string => {
  if (!text) return "[]";
  let clean = text.trim();
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return clean;
}

// Helper: Delay for backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Safe Generate Content with Retry Logic
const safeGenerateContent = async (modelName: string, params: any, retries = 2): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await ai.models.generateContent({
        model: modelName,
        ...params
      });
      return result;
    } catch (error: any) {
      // Check for 429 or Quota Exceeded
      const isQuotaError = error.message?.includes('429') || 
                           error.status === 429 || 
                           error.toString().includes('Quota') ||
                           error.toString().includes('RESOURCE_EXHAUSTED');

      if (isQuotaError) {
        if (i === retries - 1) throw new Error("QUOTA_EXCEEDED");
        const waitTime = 1000 * Math.pow(2, i);
        console.warn(`Quota exceeded. Retrying in ${waitTime}ms...`);
        await delay(waitTime);
        continue;
      }
      throw error;
    }
  }
};

/**
 * Step 1: Search for cards based on bank name
 */
export const searchCardsByBank = async (bankName: string): Promise<string[]> => {
  const prompt = `List the top 5 most popular current credit card names offered by ${bankName}. Return only the card names as a simple JSON array of strings. Do not include markdown formatting.`;
  
  try {
    const response = await safeGenerateContent(MODEL_FAST, {
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
    if (!text) throw new Error("Empty response");
    return JSON.parse(cleanJson(text)) as string[];
  } catch (error) {
    console.warn("Error searching cards, using fallback:", error);
    // Fallback logic
    const normalizedBank = bankName.toUpperCase();
    const key = Object.keys(FALLBACK_COMMON_CARDS).find(k => normalizedBank.includes(k)) || 'DEFAULT';
    return FALLBACK_COMMON_CARDS[key];
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
    const response = await safeGenerateContent(MODEL_FAST, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) throw new Error("No data returned from Gemini");
    return JSON.parse(cleanJson(text));
  } catch (error) {
    console.error("Error fetching card details, using template:", error);
    // Return partial structure so app doesn't crash, allowing manual entry
    return {
        bankName,
        cardName,
        network: CardType.OTHER,
        colorTheme: '#1e293b',
        rewards: [{ category: "General", rate: "1x", description: "Standard Purchase Rate" }],
        benefits: [{ title: "Manual Entry Recommended", description: "We couldn't auto-fetch details due to high traffic. Please add benefits manually." }]
    };
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

  const walletSummary = userCards.map(c => ({
    id: c.id,
    name: `${c.bankName} ${c.cardName}`,
    nickName: c.nickName || '',
    rewards: c.rewards,
    benefits: c.benefits,
    additionalNotes: c.manualDetails || '', 
    documents: c.documents?.map(d => d.name).join(', ') || ''
  }));

  const prompt = `
  User is making a purchase/transaction described as: "${query}".
  
  Here is their wallet:
  ${JSON.stringify(walletSummary, null, 2)}
  
  Select the single best card ID from the wallet.
  Explain why in one short sentence. You can refer to the card by its Nickname if available.
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
    const response = await safeGenerateContent(MODEL_FAST, {
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(cleanJson(text)) as RecommendationResult;
  } catch (error) {
    console.error("Error recommending card:", error);
    return null;
  }
};
