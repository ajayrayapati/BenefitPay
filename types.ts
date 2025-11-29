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

export interface CreditCard {
  id: string;
  bankName: string;
  cardName: string;
  holderName: string; // Added user input field
  network: CardType;
  colorTheme: string; // hex code or gradient class
  rewards: RewardCategory[];
  benefits: CardBenefit[]; // Warranties, protections
  lastFour?: string;
}

export interface RecommendationResult {
  cardId: string;
  reasoning: string;
  estimatedReward?: string;
}

// Navigation Views
export enum AppView {
  WALLET = 'WALLET',
  ADD_CARD = 'ADD_CARD',
  RECOMMEND = 'RECOMMEND'
}