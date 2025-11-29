
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
  lastFour?: string;
  
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
}

export enum AppView {
  WALLET = 'WALLET',
  ADD_CARD = 'ADD_CARD',
  RECOMMEND = 'RECOMMEND'
}
