
import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CardType, CreditCard, RecommendationResult, MarketRecommendation, ProductResearchResult, SpendAnalysisResult } from "../types";

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

// --- API KEY OBFUSCATION ---
const KEY_CHUNKS = [
  "", // Chunk 1 (e.g. "AIza")
  "", // Chunk 2
  "", // Chunk 3
  "", // Chunk 4
  "", // Chunk 5
  "", // Chunk 6
  "", // Chunk 7
  "", // Chunk 8
  "", // Chunk 9
  "", // Chunk 10
  "", // Chunk 11
  "", // Chunk 12
  "", // Chunk 13
  "", // Chunk 14
  ""  // Chunk 15
];

const getApiKey = () => {
  // Priority 1: Environment Variable (Secure for AI Studio)
  if (process.env.API_KEY) return process.env.API_KEY;
  
  // Priority 2: Reassembled Obfuscated Key
  const assembled = KEY_CHUNKS.join("");
  if (assembled.length > 10) return assembled;

  // Fallback/Error
  console.warn("API Key not found in environment or chunks.");
  return ""; 
};

// Helper: Get AI Client
const getAiClient = () => {
  const apiKey = getApiKey();
  return new GoogleGenAI({ apiKey });
};

// Helper: Clean JSON string from Markdown or conversational text
const cleanJson = (text: string): string => {
  if (!text) return "[]";
  let clean = text.trim();
  
  // Search for the outermost JSON object or array
  const startObj = clean.indexOf('{');
  const startArr = clean.indexOf('[');
  
  let startIndex = -1;
  let endIndex = -1;

  // Determine if it starts as an Object or Array
  if (startObj !== -1 && (startArr === -1 || startObj < startArr)) {
    startIndex = startObj;
    endIndex = clean.lastIndexOf('}');
  } else if (startArr !== -1) {
    startIndex = startArr;
    endIndex = clean.lastIndexOf(']');
  }

  // If a valid JSON structure is found embedded in text, extract it
  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return clean.substring(startIndex, endIndex + 1);
  }

  // Fallback for standard markdown blocks if simple search fails
  if (clean.startsWith('```json')) {
    clean = clean.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (clean.startsWith('```')) {
    clean = clean.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  
  return clean;
}

// Helper: Try Parse JSON with auto-repair for common LLM errors
const tryParseJson = (jsonString: string) => {
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // Attempt to fix common JSON errors from LLMs
    try {
      let fixed = jsonString.replace(/}\s*\{/g, '}, {');
      return JSON.parse(fixed);
    } catch (e2) {
      throw e; // Throw original error if fix fails
    }
  }
}

// Helper: Delay for backoff
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Helper: Safe Generate Content with Retry Logic
const safeGenerateContent = async (modelName: string, params: any, retries = 2): Promise<any> => {
  const ai = getAiClient(); 
  
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
    return tryParseJson(cleanJson(text)) as string[];
  } catch (error: any) {
    console.warn("Error searching cards, using fallback:", error);
    const normalizedBank = bankName.toUpperCase();
    const key = Object.keys(FALLBACK_COMMON_CARDS).find(k => normalizedBank.includes(k)) || 'DEFAULT';
    return FALLBACK_COMMON_CARDS[key];
  }
};

/**
 * Step 2: Get detailed info (Rewards & Benefits) for a selected card
 */
export const fetchCardDetails = async (cardName: string, bankName: string): Promise<Partial<CreditCard>> => {
  const prompt = `Provide details for the credit card: "${bankName} ${cardName}".
  
  Populate the following fields based on the provided schema:
  - network (e.g. VISA, AMEX)
  - colorTheme (Hex code matching the card's physical look)
  - rewards (List top 5 categories with rates)
  - benefits (List top 5 key benefits like insurance, warranties)
  
  Keep descriptions concise (under 10 words).
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
    return tryParseJson(cleanJson(text));
  } catch (error: any) {
    console.error("Error fetching card details, using template:", error);
    return {
        bankName,
        cardName,
        network: CardType.OTHER,
        colorTheme: '#1e293b',
        rewards: [{ category: "General", rate: "1x", description: "Standard Purchase Rate" }],
        benefits: [{ title: "Manual Entry Recommended", description: "We couldn't auto-fetch details. Please add benefits manually." }]
    };
  }
};

/**
 * Step 3: Recommend a card
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
  User transaction: "${query}".
  
  Task:
  1. Use Google Search to find current Rakuten, PayPal, or Capital One Shopping cashback offers for this merchant.
  2. Analyze the user's wallet to find the best credit card for points/benefits.
  3. CALCULATE THE TOTAL VALUE: Add the Credit Card Reward (approx %) + Stacking Offer (%).
  4. Create a strategy checklist to maximize this savings.
  5. If user provided a dollar amount, use it for calculations.

  Wallet Data:
  ${JSON.stringify(walletSummary, null, 2)}
  
  Output ONLY raw JSON (no markdown) in this format:
  {
    "cardId": "string (id of best card)",
    "reasoning": "string (why this card + warranty info)",
    "estimatedReward": "string (e.g. '3% back from card')",
    "stackingInfo": "string (e.g. 'Rakuten offers additional 5% cashback. Capital One Shopping has exclusive rewards.')",
    "optimizationAnalysis": {
        "totalPotentialReturn": "string (e.g. 'Total ~8% Return')",
        "stepsToMaximize": ["string (Step 1: Activate Rakuten)", "string (Step 2: Use Amex Gold)"]
    }
  }
  `;

  try {
    const response = await safeGenerateContent(MODEL_FAST, {
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }] 
      }
    });

    const text = response.text;
    if (!text) return null;

    const parsed = tryParseJson(cleanJson(text)) as RecommendationResult;
    
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
      const chunks = response.candidates[0].groundingMetadata.groundingChunks;
      parsed.sources = chunks
        .filter((c: any) => c.web?.uri && c.web?.title)
        .map((c: any) => ({ title: c.web.title, uri: c.web.uri }));
    }

    return parsed;
  } catch (error: any) {
    console.error("Error recommending card:", error);
    return null;
  }
};

/**
 * Step 4: Search the market for a BETTER card
 */
export const findBetterMarketCard = async (
    query: string,
    amount: string,
    currentBestCardName: string
  ): Promise<MarketRecommendation | null> => {
    
    const prompt = `
    User is buying: "${query}" for Amount: $${amount}.
    User's current best card is: "${currentBestCardName}".
    
    TASK: 
    Using Google Search, find ONE credit card currently available on the market (US) that would be SIGNIFICANTLY better for this specific purchase than the user's current card.
    
    Focus on:
    1. Sign-Up Bonuses (SUB) - Since the purchase amount is high, it contributes to spend requirements.
    2. High Category Cashback for this merchant.
    3. Purchase Protection / Extended Warranty benefits.
    4. 0% Intro APR if applicable.
  
    Output ONLY raw JSON:
    {
      "bankName": "string",
      "cardName": "string",
      "headline": "string (e.g. 'Earn $200 Bonus + 5% Back')",
      "whyBetter": "string (Direct comparison: 'This card offers X which beats your current card's Y')",
      "benefitsForThisPurchase": ["string (benefit 1)", "string (benefit 2)"],
      "applySearchQuery": "string (keywords to google search for application)"
    }
    `;
  
    try {
      const response = await safeGenerateContent(MODEL_FAST, {
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }]
        }
      });
  
      const text = response.text;
      if (!text) return null;
  
      return tryParseJson(cleanJson(text)) as MarketRecommendation;
    } catch (error: any) {
      console.error("Error finding market card:", error);
      return null;
    }
  };

/**
 * Step 5: Payment Research
 */
export const performProductResearch = async (
  input: { name: string; model?: string; price?: string; store?: string; barcode?: string },
  image?: string 
): Promise<ProductResearchResult | null> => {

  const hasImage = !!image;
  const productDesc = input.barcode ? `Product with Barcode/UPC: ${input.barcode}` : `${input.name} ${input.model || ''}`;
  const priceCtx = input.price ? `User sees price: $${input.price}` : 'No price provided';
  const storeCtx = input.store ? `at store: ${input.store}` : 'at general market';
  
  // Construct parts: Text Prompt + Optional Image
  const promptText = `
  Task: Product Price-to-Value Research.
  ${hasImage ? "Identify the product in the image." : ""}
  User Query: "${productDesc}" ${priceCtx} ${storeCtx}.

  STRICT INSTRUCTIONS:
  1. Use Google Search to find the EXACT REAL-TIME PRICE of this specific model (or Barcode ${input.barcode || 'N/A'}) at major retailers (Amazon, Best Buy, Walmart, Target). 
     DO NOT HALLUCINATE PRICES. If you can't find it, verify the MSRP.
  2. Generate valid URL to purchase the alternative products.
  3. Compare the user's observed price ($${input.price || 'N/A'}) vs the market best price.
  4. Verdict: Is it a 'Good Buy' (Cheaper than market), 'Overpriced' (More expensive than Amazon/BestBuy), or 'Wait' (Price trending down)?
  5. Generate 6-month price history based on general market trends for this category/product.
  6. Find 3 SPECIFIC alternatives that offer better value.

  IMPORTANT:
  - Your response MUST BE A VALID JSON OBJECT only.
  - Do NOT output conversational text like "Here is the research".
  - Do NOT output markdown formatting like \`\`\`json.
  - Start the response immediately with {.

  Output Schema:
  {
    "productName": "string (identified product full name)",
    "currentPrice": "string (e.g. $199)",
    "verdict": "Good Buy" | "Wait" | "Overpriced",
    "verdictReason": "string (Comparison: 'Amazon has it for $150 vs your $199...')",
    "priceHistory": [
       {"month": "string (e.g. Jan)", "price": number} 
       // Provide exactly 6 data points representing last 6 months
    ],
    "sentimentScore": number (0-100),
    "sentimentSummary": "string (Summarize real user reviews)",
    "alternatives": [
       { 
         "name": "string", 
         "price": "string", 
         "whyBetter": "string",
         "link": "string (URL to product or query)"
       }
    ]
  }
  `;

  const parts: any[] = [{ text: promptText }];
  if (image) {
    const base64Clean = image.split(',')[1] || image;
    parts.unshift({
      inlineData: {
        mimeType: "image/jpeg",
        data: base64Clean
      }
    });
  }

  try {
    const response = await safeGenerateContent(MODEL_FAST, {
      contents: { parts },
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text;
    if (!text) return null;

    return tryParseJson(cleanJson(text)) as ProductResearchResult;
  } catch (error: any) {
    console.error("Error performing research:", error);
    return null;
  }
};

/**
 * Step 6: SpendIQ - Analyze Statement
 */
export const analyzeSpendStatement = async (
    fileBase64: string,
    mimeType: string,
    allCards: CreditCard[]
): Promise<SpendAnalysisResult | null> => {
    
    // Convert allCards to summary string
    const cardsSummary = allCards.map(c => ({
        id: c.id,
        name: `${c.bankName} ${c.cardName}`,
        nickName: c.nickName || '',
        rewards: c.rewards
    }));

    const promptText = `
    Analyze this credit card statement document.
    
    PRE-ANALYSIS:
    1. Identify the Bank Name and Card Name (e.g. "Chase Sapphire") from the document header or logo. This is the "Used Card".
    2. Match the identified card against the 'User Wallet Rewards Data' to see if it exists in the user's wallet. If it does, use those reward rates. If not, use general knowledge for that card.

    TASK:
    1. Extract each transaction (Date, Merchant, Amount).
    2. Categorize the transaction (Dining, Travel, Grocery, Gas, Online, etc.).
    3. CALCULATE "Actual Rewards": The $ value earned using the identified "Used Card" for that transaction.
    4. CALCULATE "Potential Rewards": The $ value that could have been earned using the BEST card from the "User Wallet Rewards Data" provided below.
    5. CALCULATE "Missed Savings": (Potential Rewards) - (Actual Rewards).
       - If Actual >= Potential, Missed Savings is 0.
       - ONLY show a delta (positive number) if the user ACTUALLY missed out on money.

    User Wallet Rewards Data (Potential Cards):
    ${JSON.stringify(cardsSummary, null, 2)}

    Output STRICT JSON:
    {
      "detectedCard": "string (The bank/card name you identified from the file)",
      "totalSpend": number (sum of all amounts),
      "totalMissedSavings": number (sum of missed savings),
      "topMissedCategory": "string (e.g. Dining)",
      "transactions": [
         {
            "date": "string",
            "merchant": "string",
            "amount": number,
            "category": "string",
            "usedCardRewardVal": number (dollar amount earned on statement card),
            "bestCardId": "string (id from wallet data)",
            "bestCardName": "string",
            "bestCardRewardVal": number,
            "missedSavings": number (Difference: Best - Used. 0 if Used was best),
            "reasoning": "string (e.g. Amex Gold earns 4x ($4.00) vs Statement Card 1x ($1.00))"
         }
      ]
    }
    `;

    const base64Clean = fileBase64.split(',')[1] || fileBase64;
    
    // Support PDF or Image mime types
    const validMime = mimeType === 'application/pdf' ? 'application/pdf' : 'image/jpeg';

    const parts: any[] = [
        { inlineData: { mimeType: validMime, data: base64Clean } },
        { text: promptText }
    ];

    try {
        const response = await safeGenerateContent(MODEL_FAST, {
            contents: { parts }
        });

        const text = response.text;
        if (!text) return null;

        return tryParseJson(cleanJson(text)) as SpendAnalysisResult;
    } catch (error: any) {
        console.error("Error analyzing spend:", error);
        return null;
    }
}
