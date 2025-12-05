

import { GoogleGenAI, Type, Schema } from "@google/genai";
import { CardType, CreditCard, RecommendationResult, MarketRecommendation, ProductResearchResult, SpendAnalysisResult, PortfolioAnalysisResult, BankAnalysisResult, CartAnalysisResult, Receipt } from "../types";

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
 * Step 6: SpendIQ - Analyze Statement (OPTIMIZED)
 * Now processes multiple files and aggregates by category for speed.
 * UPDATED: Now detects recurring and suspicious activity.
 */
export const analyzeSpendStatement = async (
    files: string[], // Base64 PDF content
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
    Analyze the provided CREDIT CARD statement(s).
    
    TASK (Optimization Mode - FAST):
    1. Identify the "Used Card" (Bank/Name) from the document headers.
    2. AGGREGATE all spending into standard categories (Dining, Groceries, Travel, Gas, Online Retail, Utilities, Other).
    3. Calculate "Total Spend" for each category.
    4. For each category:
       - Calculate "Actual Rewards": $ value earned using the detected "Used Card".
       - Calculate "Best Wallet Card": Pick the card from the "User Wallet Data" below that offers the highest return for this category.
       - Calculate "Potential Rewards": $ value if the Best Card was used.
       - Calculate "Missed Savings": (Potential - Actual). Return 0 if Actual >= Potential.
    5. DETECT Recurring Subscriptions (Top 5 highest value only).
    6. DETECT Suspicious Activity (Top 3 most concerning).

    User Wallet Data:
    ${JSON.stringify(cardsSummary, null, 2)}

    Output STRICT JSON (Keep summaries concise under 30 words):
    {
      "detectedCard": "string (e.g. Chase Sapphire)",
      "totalSpend": number,
      "totalMissedSavings": number (Sum of all missed savings),
      "topMissedCategory": "string",
      "analysisSummary": "string (Brief insight, max 30 words)",
      "categoryAnalysis": [
         {
            "category": "string",
            "totalAmount": number,
            "percentage": number (of total spend),
            "usedCardRewardVal": number,
            "bestCardName": "string",
            "bestCardRewardVal": number,
            "missedSavings": number
         }
      ],
      "recurringPayments": [ { "name": "string", "amount": number, "frequency": "string (Monthly)", "category": "string" } ],
      "suspiciousTransactions": [ { "description": "string", "amount": number, "date": "string", "reason": "string (e.g. Duplicate or High Fee)" } ]
    }
    `;

    const parts: any[] = [{ text: promptText }];
    
    // Add all files
    files.forEach(base64 => {
        const base64Clean = base64.split(',')[1] || base64;
        parts.push({
            inlineData: { mimeType: 'application/pdf', data: base64Clean }
        });
    });

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

/**
 * Step 7: Market Spend Recommender (SpendFit) - Detailed Monthly Analysis
 */
export const analyzePortfolioAndRecommend = async (
    files: { base64: string; mimeType: string }[]
): Promise<PortfolioAnalysisResult | null> => {

    const promptText = `
    TASK: SpendFit Portfolio Analysis & Card Recommendation. (FAST Mode)
    
    Step 1: Analyze statements. Identify the Statement Month/Year and "Used Card Name".
    Step 2: Aggregate spend for EACH MONTH into categories (Dining, Groceries, Gas, Travel, Retail, Utilities, Other).
    Step 3: Calculate AVERAGE MONTHLY SPEND per category.
    Step 4: Based on this profile, identify the single BEST credit card currently available in the US Market that maximizes annual rewards.
    Step 5: Calculate 'Potential Increase' in dollar value (Recommended Card Rewards - Detected Actual Rewards).
    
    Rules:
    - Use Google Search to verify current sign-up bonuses and reward rates.
    - Keep reasoning brief (Max 30 words).
    - If exact month is unknown, label it "Month 1".

    Output STRICT JSON:
    {
      "totalAnalyzedSpend": number,
      "spendProfile": [ { "category": "string", "amount": number, "percentage": number } ], 
      
      "monthlyBreakdown": [
        {
           "month": "string (e.g. Sep 2023)",
           "breakdown": [ { "category": "string", "amount": number } ],
           "total": number
        }
      ],
      
      "averageProfile": [
        {
           "category": "string",
           "averageAmount": number,
           "potentialIncrease": number (Dollar value difference)
        }
      ],

      "recommendedMarketCard": {
         "bankName": "string",
         "cardName": "string",
         "headline": "string",
         "estimatedAnnualReturn": "string",
         "reasoning": "string (Max 30 words)",
         "applySearchQuery": "string"
      }
    }
    `;

    const parts: any[] = [{ text: promptText }];
    
    // Append all file parts
    files.forEach(f => {
        const base64Clean = f.base64.split(',')[1] || f.base64;
        const validMime = f.mimeType === 'application/pdf' ? 'application/pdf' : 'image/jpeg';
        parts.push({
            inlineData: { mimeType: validMime, data: base64Clean }
        });
    });

    try {
        const response = await safeGenerateContent(MODEL_FAST, {
            contents: { parts },
            config: {
                tools: [{ googleSearch: {} }] // Enable search for current market info
            }
        });

        const text = response.text;
        if (!text) return null;

        return tryParseJson(cleanJson(text)) as PortfolioAnalysisResult;
    } catch (error: any) {
        console.error("Error analyzing portfolio:", error);
        return null;
    }
};

/**
 * Step 8: BankIQ - Bank Statement Analysis
 */
export const analyzeBankStatements = async (
  files: string[] // Base64 PDF content
): Promise<BankAnalysisResult | null> => {
  const promptText = `
  Analyze the provided BANK statements (PDFs).
  
  TASK (FAST Mode):
  1. Cash Flow: Calculate Total Deposits (In) and Withdrawals (Out).
  2. Category Breakdown: Group expenses by category (Rent, Utilities, Food, Transport, etc.).
  3. Subscription Detection: Identify recurring payments (Top 10 only).
  4. SAVINGS OPPORTUNITY DETECTION (Top 3 highest impact):
     - Check for high ATM fees.
     - Identify duplicate payments.
     - Highlight overpriced utilities/insurance.
     - Identify subscription optimizations.
  5. SUSPICIOUS ACTIVITY: Check for suspicious duplicate charges or high fees.

  Output STRICT JSON (Keep summary concise):
  {
    "cashFlow": { "totalIn": number, "totalOut": number, "netFlow": number },
    "categoryBreakdown": [ { "category": "string", "amount": number, "percentage": number } ],
    "subscriptions": [ { "name": "string", "amount": number, "frequency": "string", "category": "string" } ],
    "savingsOpportunities": [
       {
         "title": "string (Brief)",
         "description": "string (Brief)",
         "potentialMonthlySavings": number,
         "type": "SUBSCRIPTION" | "UTILITY" | "FEE" | "INSURANCE" | "DUPLICATE"
       }
    ],
    "suspiciousTransactions": [ { "description": "string", "amount": number, "date": "string", "reason": "string" } ],
    "overallHealthScore": number (0-100 score based on savings/waste),
    "summary": "string"
  }
  `;

  const parts: any[] = [{ text: promptText }];
  files.forEach(base64 => {
      const base64Clean = base64.split(',')[1] || base64;
      parts.push({
          inlineData: { mimeType: 'application/pdf', data: base64Clean }
      });
  });

  try {
      const response = await safeGenerateContent(MODEL_FAST, {
          contents: { parts }
      });

      const text = response.text;
      if (!text) return null;

      return tryParseJson(cleanJson(text)) as BankAnalysisResult;
  } catch (error: any) {
      console.error("Error analyzing bank statements:", error);
      return null;
  }
};

/**
 * Step 9: Cart Saver - Analyze Shopping Cart Image
 */
export const analyzeShoppingCart = async (
  imageBase64: string,
  storeName: string
): Promise<CartAnalysisResult | null> => {
  const promptText = `
  Analyze this image of a shopping cart/basket at a store.
  User Store: "${storeName}".

  TASK:
  1. Identify all visible products/items in the cart.
  2. For each identified item:
     - Estimate the current price at ${storeName}.
     - Use Google Search to find if a CHEAPER option exists nearby or online (e.g. Walmart, Amazon, Target, Costco).
     - Calculate potential savings (Current Price - Best Alternative).
  3. If an item cannot be clearly identified, skip it or mark it.
  4. If the cart is empty or blurry, return unidentifiedItemsWarning: true.

  Output STRICT JSON:
  {
    "storeAnalyzed": "${storeName}",
    "identifiedItemCount": number,
    "totalEstimatedSavings": number,
    "unidentifiedItemsWarning": boolean,
    "summary": "string (e.g. 'Found 5 items. You could save $12 by buying the electronics online.')",
    "items": [
      {
        "name": "string",
        "currentStorePrice": number,
        "bestAlternativeStore": "string",
        "bestAlternativePrice": number,
        "potentialSavings": number,
        "link": "string (search url)"
      }
    ]
  }
  `;

  const base64Clean = imageBase64.split(',')[1] || imageBase64;
  const parts = [
      { text: promptText },
      { inlineData: { mimeType: 'image/jpeg', data: base64Clean } }
  ];

  try {
      const response = await safeGenerateContent(MODEL_FAST, {
          contents: { parts },
          config: {
              tools: [{ googleSearch: {} }]
          }
      });

      const text = response.text;
      if (!text) return null;

      return tryParseJson(cleanJson(text)) as CartAnalysisResult;
  } catch (error: any) {
      console.error("Error analyzing cart:", error);
      return null;
  }
};

/**
 * Step 10: Receipt Tracker - Parse Receipt Image
 */
export const parseReceipt = async (imageBase64: string): Promise<Partial<Receipt> | null> => {
    const promptText = `
    Analyze this receipt image.
    
    TASK:
    1. Extract the Store/Merchant Name.
    2. Extract the Date of transaction. If not found, return null.
    3. Extract the Total Amount.
    4. Extract EVERY single line item name into a list (this is used for searching).
    
    Output STRICT JSON:
    {
      "storeName": "string",
      "date": "string (YYYY-MM-DD or readable format) or null",
      "totalAmount": number,
      "items": ["string (Item 1)", "string (Item 2)", "string (Item 3)..."]
    }
    `;

    const base64Clean = imageBase64.split(',')[1] || imageBase64;
    const parts = [
        { text: promptText },
        { inlineData: { mimeType: 'image/jpeg', data: base64Clean } }
    ];

    try {
        const response = await safeGenerateContent(MODEL_FAST, {
            contents: { parts }
        });
        
        const text = response.text;
        if (!text) return null;
        return tryParseJson(cleanJson(text)) as Partial<Receipt>;
    } catch (e) {
        console.error("Error parsing receipt", e);
        return null;
    }
};
