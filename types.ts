

export enum CardType {
  VISA = 'VISA',
  MASTERCARD = 'MASTERCARD',
  AMEX = 'AMEX',
  DISCOVER = 'DISCOVER',
  OTHER = 'OTHER'
}

export interface RewardCategory {
  category: string;
  rate: string; // e.g. "3x", "5%", "2 miles"
  description: string;
}

export interface CardBenefit {
  title: string;
  description: string;
}

export interface CardDocument {
  id: string;
  name: string;
  type: 'pdf' | 'text' | 'image';
  content?: string; // For text/pasted content
  dateAdded: string;
}

export interface CreditCard {
  id: string;
  bankName: string;
  cardName: string;
  holderName: string; 
  network: CardType;
  colorTheme: string; 
  rewards: RewardCategory[];
  benefits: CardBenefit[];
  nickName?: string; 
  
  // Manual / Custom Data
  manualDetails?: string; // Large text block for pasted policies/warranties
  documents?: CardDocument[]; // List of attached files (metadata)
  
  // Metadata
  lastRefreshed?: string; // ISO Date string
}

export interface RecommendationResult {
  cardId: string;
  reasoning: string;
  estimatedReward?: string;
  stackingInfo?: string; // Information about Rakuten/Paypal offers
  optimizationAnalysis?: {
    totalPotentialReturn: string; // e.g. "Up to 9% Value"
    stepsToMaximize: string[]; // ["Use Rakuten (4%)", "Pay with Gold Card (4x)", "Check Amex Offers"]
  };
  sources?: { title: string; uri: string }[]; // Links to sources found via Google Search
}

export interface MarketRecommendation {
  bankName: string;
  cardName: string;
  headline: string; // e.g. "Earn $200 Bonus"
  whyBetter: string; // Comparison reasoning vs current card
  benefitsForThisPurchase: string[]; // List of specific benefits for this item
  applySearchQuery: string; // String to construct google search link
}

// --- PRODUCT RESEARCH TYPES ---
export interface PricePoint {
  month: string; // e.g. "Jan"
  price: number;
}

export interface ProductAlternative {
  name: string;
  price: string;
  whyBetter: string; // Value proposition
  link?: string; // URL or search query for the product
}

export interface ProductResearchResult {
  productName: string;
  currentPrice: string;
  verdict: 'Good Buy' | 'Wait' | 'Overpriced';
  verdictReason: string;
  priceHistory: PricePoint[]; // For Last 6 Months Graph
  sentimentScore: number; // 0 to 100
  sentimentSummary: string;
  alternatives: ProductAlternative[];
}

// --- SPEND IQ TYPES (OPTIMIZED) ---
export interface SpendCategoryAnalysis {
  category: string;
  totalAmount: number;
  percentage: number;
  usedCardRewardVal: number; // $ value earned
  bestCardName: string;
  bestCardRewardVal: number; // $ value could have earned
  missedSavings: number; // The difference
}

export interface SpendAnalysisResult {
  detectedCard: string;
  totalSpend: number;
  totalMissedSavings: number;
  categoryAnalysis: SpendCategoryAnalysis[];
  topMissedCategory: string;
  analysisSummary: string; // Brief text summary
}

// --- MARKET SPEND RECOMMENDER TYPES ---
export interface CategorySpend {
  category: string;
  amount: number;
  percentage: number;
}

export interface PortfolioAnalysisResult {
  totalAnalyzedSpend: number;
  spendProfile: CategorySpend[]; // e.g. [{ category: "Dining", amount: 5000, percentage: 40 }]
  recommendedMarketCard: {
    bankName: string;
    cardName: string;
    headline: string;
    estimatedAnnualReturn: string; // e.g. "$850 / year"
    reasoning: string; // Why this fits the profile
    applySearchQuery: string;
  };
}

export enum AppView {
  WALLET = 'WALLET',
  ADD_CARD = 'ADD_CARD',
  RECOMMEND = 'RECOMMEND',
  RESEARCH = 'RESEARCH',
  SPEND_IQ = 'SPEND_IQ',
  MARKET_REC = 'MARKET_REC', // New view
  HELP = 'HELP'
}